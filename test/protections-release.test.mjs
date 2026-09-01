import assert from 'node:assert/strict';
import test from 'node:test';
import { errorHandler, CORS_ORIGIN_FORBIDDEN, requireAllowedOrigin } from '../dist/middleware/httpPolicy.js';
import { idempotency } from '../dist/middleware/idempotency.js';
import { rateLimit } from '../dist/middleware/rateLimit.js';
import verifyTurnstile from '../dist/middleware/verifyTurnstile.js';
import IdempotencyRecord from '../dist/model/idempotencyRecordModel.js';
import RateLimitBucket from '../dist/model/rateLimitBucketModel.js';
import { createRequest, createResponse, nextSpy } from './helpers.mjs';

test('mutating requests reject untrusted origins and allow configured origins', () => {
    const middleware = requireAllowedOrigin(['https://src.example']);
    const rejected = createResponse();
    middleware(createRequest({ headers: { origin: 'https://evil.example' } }), rejected.res, () => assert.fail('must not continue'));
    assert.equal(rejected.state.statusCode, 403);
    assert.equal(rejected.state.body.code, 'ORIGIN_FORBIDDEN');

    const allowed = nextSpy();
    middleware(createRequest({ headers: { origin: 'https://src.example' } }), createResponse().res, allowed.next);
    assert.equal(allowed.state.called, true);
});

test('CORS callback failures are returned as an explicit forbidden response', () => {
    const response = createResponse();
    errorHandler(Object.assign(new Error('Not allowed by CORS'), { code: CORS_ORIGIN_FORBIDDEN }), createRequest(), response.res, () => {});
    assert.equal(response.state.statusCode, 403);
    assert.equal(response.state.body.code, 'CORS_ORIGIN_FORBIDDEN');
});

test('rate limiting emits limits and rejects requests over quota', async (t) => {
    process.env.RATE_LIMIT_SECRET = 'release-test-rate-secret-at-least-32-characters';
    const original = RateLimitBucket.findOneAndUpdate;
    t.after(() => { RateLimitBucket.findOneAndUpdate = original; });
    let count = 0;
    RateLimitBucket.findOneAndUpdate = () => ({ lean: async () => ({ count: ++count }) });
    const middleware = rateLimit({ scope: 'release', limit: 1, windowMs: 60_000 });

    const allowed = createResponse();
    const next = nextSpy();
    await middleware(createRequest(), allowed.res, next.next);
    assert.equal(next.state.called, true);
    assert.equal(allowed.state.headers['ratelimit-remaining'], '0');

    const rejected = createResponse();
    await middleware(createRequest(), rejected.res, () => assert.fail('must not continue'));
    assert.equal(rejected.state.statusCode, 429);
    assert.equal(rejected.state.body.code, 'RATE_LIMITED');
    assert.ok(Number(rejected.state.headers['retry-after']) >= 1);
});

test('completed submissions replay their original idempotent response', async (t) => {
    process.env.IDEMPOTENCY_SECRET = 'release-test-idempotency-secret-at-least-32-characters';
    const originals = { create: IdempotencyRecord.create, findOne: IdempotencyRecord.findOne };
    t.after(() => Object.assign(IdempotencyRecord, originals));
    IdempotencyRecord.create = async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); };
    IdempotencyRecord.findOne = async () => ({
        payloadHash: 'ignored-until-patched',
        status: 'completed',
        responseStatus: 201,
        responseBody: { message: 'Already accepted', referenceId: 'submission-1' },
        updatedAt: new Date(),
    });

    const req = createRequest({
        body: { name: 'Release User', turnstileToken: 'new-provider-token' },
        headers: { 'idempotency-key': 'release-key-00000001' },
    });
    const { createHash } = await import('node:crypto');
    const payloadHash = createHash('sha256').update(JSON.stringify({ name: 'Release User' })).digest('hex');
    IdempotencyRecord.findOne = async () => ({
        payloadHash,
        status: 'completed',
        responseStatus: 201,
        responseBody: { message: 'Already accepted', referenceId: 'submission-1' },
        updatedAt: new Date(),
    });

    const response = createResponse();
    await idempotency('registration')(req, response.res, () => assert.fail('replay must not execute handler'));
    assert.equal(response.state.statusCode, 201);
    assert.deepEqual(response.state.body, { message: 'Already accepted', referenceId: 'submission-1' });
});

test('Turnstile rejects provider failures and unexpected hostnames', async (t) => {
    process.env.TURNSTILE_SECRET_KEY = 'turnstile-secret';
    process.env.TURNSTILE_EXPECTED_HOSTNAME = 'src.example';
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; delete process.env.TURNSTILE_EXPECTED_HOSTNAME; });

    globalThis.fetch = async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), {
        status: 200, headers: { 'content-type': 'application/json' },
    });
    const providerRejected = createResponse();
    await verifyTurnstile(createRequest({ body: { turnstileToken: 'bad' } }), providerRejected.res, () => assert.fail('must not continue'));
    assert.equal(providerRejected.state.statusCode, 403);
    assert.equal(providerRejected.state.body.code, 'TURNSTILE_INVALID');

    globalThis.fetch = async () => new Response(JSON.stringify({ success: true, hostname: 'evil.example' }), {
        status: 200, headers: { 'content-type': 'application/json' },
    });
    const hostnameRejected = createResponse();
    await verifyTurnstile(createRequest({ body: { turnstileToken: 'valid-elsewhere' } }), hostnameRejected.res, () => assert.fail('must not continue'));
    assert.equal(hostnameRejected.state.statusCode, 403);
});
