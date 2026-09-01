import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { signup, confirmEmail, login, logout, me } from '../dist/controller/auth/auth.js';
import { authMiddleware, hasPermission, optionalAuthMiddleware, requirePermission } from '../dist/middleware/authMiddleware.js';
import EmailOutbox from '../dist/model/emailOutboxModel.js';
import User from '../dist/model/userModel.js';
import { createRequest, createResponse, flushTasks, nextSpy } from './helpers.mjs';

const permissions = [
    'dashboard.read', 'content.read', 'content.update', 'content.publish',
    'semesters.manage', 'news.manage', 'news.publish', 'submissions.review',
    'mentors.manage', 'publications.manage', 'media.manage', 'audit.read', 'users.manage',
];

const expectedByRole = {
    super_admin: permissions,
    admin: permissions.filter((permission) => permission !== 'users.manage'),
    editor: ['dashboard.read', 'content.read', 'content.update', 'news.manage', 'media.manage'],
    reviewer: ['dashboard.read', 'content.read', 'submissions.review', 'news.manage'],
    contributor: ['dashboard.read', 'content.read', 'content.update', 'news.manage'],
    viewer: ['dashboard.read', 'content.read'],
    user: [],
};

test('every admin role has exactly its documented permissions', () => {
    for (const [role, expected] of Object.entries(expectedByRole)) {
        for (const permission of permissions) {
            assert.equal(
                hasPermission(role, permission),
                expected.includes(permission),
                `${role} permission mismatch for ${permission}`,
            );
        }
    }
});

test('permission middleware distinguishes unauthenticated, forbidden, and allowed users', () => {
    const middleware = requirePermission('users.manage');

    const unauthenticated = createResponse();
    middleware(createRequest(), unauthenticated.res, () => assert.fail('must not continue'));
    assert.equal(unauthenticated.state.statusCode, 401);

    const forbidden = createResponse();
    middleware(createRequest({ user: { id: '1', email: 'admin@example.com', role: 'admin' } }), forbidden.res, () => assert.fail('must not continue'));
    assert.equal(forbidden.state.statusCode, 403);

    const allowed = nextSpy();
    middleware(createRequest({ user: { id: '1', email: 'root@example.com', role: 'super_admin' } }), createResponse().res, allowed.next);
    assert.equal(allowed.state.called, true);
});

test('session check treats a missing token as an anonymous user', async () => {
    const request = createRequest({ method: 'GET' });
    const response = createResponse();
    const next = nextSpy();

    await optionalAuthMiddleware(request, response.res, next.next);
    assert.equal(next.state.called, true);

    me(request, response.res);
    assert.equal(response.state.statusCode, 200);
    assert.deepEqual(response.state.body, { user: null });
});

test('signup, confirmation, login, session check, and logout complete one account lifecycle', async (t) => {
    process.env.JWT_SECRET = 'release-test-jwt-secret-at-least-32-characters';
    process.env.EMAIL_OUTBOX_ENCRYPTION_KEY = 'release-test-outbox-key-at-least-32-characters';

    const originals = {
        create: EmailOutbox.create,
        findOneAndUpdate: EmailOutbox.findOneAndUpdate,
        userCreate: User.create,
        deleteOne: User.deleteOne,
        findById: User.findById,
        findOne: User.findOne,
        updateOne: User.updateOne,
    };
    t.after(() => Object.assign(EmailOutbox, { create: originals.create, findOneAndUpdate: originals.findOneAndUpdate }));
    t.after(() => Object.assign(User, {
        create: originals.userCreate,
        deleteOne: originals.deleteOne,
        findById: originals.findById,
        findOne: originals.findOne,
        updateOne: originals.updateOne,
    }));

    let account;
    let outboxRecord;
    EmailOutbox.create = async (record) => { outboxRecord = record; return record; };
    EmailOutbox.findOneAndUpdate = () => ({ select: async () => null });
    User.findOne = async (query) => query.email ? null : account;
    User.create = async (record) => {
        account = {
            _id: 'user-release-1',
            ...record,
            email: 'release@example.com',
            isEmailVerified: false,
            role: 'admin',
            tokenVersion: 0,
            async save() { return this; },
        };
        return account;
    };
    User.deleteOne = async () => ({ deletedCount: 1 });

    const signupResponse = createResponse();
    await signup(createRequest({ body: { email: ' Release@Example.com ', password: 'correct horse battery staple' } }), signupResponse.res);
    assert.equal(signupResponse.state.statusCode, 201);
    assert.equal(outboxRecord.eventType, 'auth.signup_confirmation');
    assert.match(account.password, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
    await flushTasks();

    const confirmationResponse = createResponse();
    await confirmEmail(createRequest({ method: 'GET', query: { token: 'opaque-confirmation-token' } }), confirmationResponse.res);
    assert.equal(confirmationResponse.state.statusCode, 200);
    assert.equal(account.isEmailVerified, true);

    User.findOne = async () => account;
    const loginResponse = createResponse();
    await login(createRequest({ body: { email: 'release@example.com', password: 'correct horse battery staple' } }), loginResponse.res);
    assert.equal(loginResponse.state.statusCode, 200);
    assert.equal(loginResponse.state.cookies[0].name, 'accessToken');
    const accessToken = loginResponse.state.cookies[0].value;

    User.findById = () => ({ lean: async () => account });
    const sessionRequest = createRequest({ method: 'GET', headers: { cookie: `accessToken=${accessToken}` } });
    const sessionNext = nextSpy();
    await authMiddleware(sessionRequest, createResponse().res, sessionNext.next);
    assert.equal(sessionNext.state.called, true);
    const sessionResponse = createResponse();
    me(sessionRequest, sessionResponse.res);
    assert.deepEqual(sessionResponse.state.body.user, {
        id: 'user-release-1', email: 'release@example.com', role: 'admin',
    });

    let logoutUpdate;
    User.updateOne = async (...args) => { logoutUpdate = args; return { modifiedCount: 1 }; };
    const logoutResponse = createResponse();
    await logout(sessionRequest, logoutResponse.res);
    assert.equal(logoutResponse.state.statusCode, 200);
    assert.deepEqual(logoutUpdate, [{ _id: 'user-release-1' }, { $inc: { tokenVersion: 1 } }]);
    assert.equal(logoutResponse.state.clearedCookies[0].name, 'accessToken');
});

test('expired access tokens are rejected before the user store is queried', async (t) => {
    const secret = 'release-test-jwt-secret-at-least-32-characters';
    process.env.JWT_SECRET = secret;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        userId: 'expired-user', tokenVersion: 0, iat: 1, exp: 2,
    })).toString('base64url');
    const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

    const original = User.findById;
    t.after(() => { User.findById = original; });
    User.findById = () => assert.fail('expired tokens must not query users');

    const response = createResponse();
    await authMiddleware(
        createRequest({ method: 'GET', headers: { authorization: `Bearer ${header}.${payload}.${signature}` } }),
        response.res,
        () => assert.fail('must not continue'),
    );
    assert.equal(response.state.statusCode, 401);
    assert.equal(response.state.body.message, 'Token has expired');
});

test('expired email confirmation tokens are rejected', async (t) => {
    const original = User.findOne;
    t.after(() => { User.findOne = original; });
    User.findOne = async () => null;

    const response = createResponse();
    await confirmEmail(createRequest({ method: 'GET', query: { token: 'expired' } }), response.res);
    assert.equal(response.state.statusCode, 400);
    assert.match(response.state.body, /invalid or has expired/);
});
