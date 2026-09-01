import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPermission } from '../dist/middleware/authMiddleware.js';
import { validateUploadedImages } from '../dist/middleware/imageValidation.js';
import { validateEnvironment } from '../dist/config/environment.js';
import { logger } from '../dist/utils/logger.js';

test('permissions deny legacy and unknown roles by default', () => {
    assert.equal(hasPermission('user', 'dashboard.read'), false);
    assert.equal(hasPermission('unknown-role', 'content.read'), false);
    assert.equal(hasPermission(undefined, 'content.read'), false);
});

test('permissions retain least-privilege role behavior', () => {
    assert.equal(hasPermission('viewer', 'content.read'), true);
    assert.equal(hasPermission('viewer', 'content.update'), false);
    assert.equal(hasPermission('admin', 'users.manage'), false);
    assert.equal(hasPermission('super_admin', 'users.manage'), true);
});

const runImageValidation = (file) => {
    let statusCode = 200;
    let body;
    let nextCalled = false;
    const req = { file };
    const res = {
        locals: { requestId: 'test-request' },
        status(code) { statusCode = code; return this; },
        json(value) { body = value; return this; },
    };
    validateUploadedImages(req, res, () => { nextCalled = true; });
    return { statusCode, body, nextCalled };
};

test('image validation accepts a matching PNG signature', () => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
    png.writeUInt32BE(100, 16);
    png.writeUInt32BE(100, 20);
    const result = runImageValidation({
        mimetype: 'image/png',
        buffer: png,
    });
    assert.equal(result.nextCalled, true);
});

test('image validation rejects spoofed image MIME', () => {
    const result = runImageValidation({
        mimetype: 'image/png',
        buffer: Buffer.from('not an image'),
    });
    assert.equal(result.statusCode, 415);
    assert.equal(result.body.code, 'INVALID_IMAGE_CONTENT');
    assert.equal(result.nextCalled, false);
});

test('production environment validation rejects incomplete configuration', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    assert.throws(() => validateEnvironment(), /Production environment validation failed/);
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
});

test('structured logger redacts secrets embedded in fields and error messages', () => {
    const previousConsoleError = console.error;
    let output = '';
    console.error = (line) => { output = String(line); };
    try {
        logger.error(
            'test.redaction',
            new Error('Bearer abc.def.ghi mongodb://user:pass@host password=canary-password'),
            { token: 'canary-token', safe: 'visible' },
        );
    } finally {
        console.error = previousConsoleError;
    }

    assert.equal(output.includes('canary-password'), false);
    assert.equal(output.includes('canary-token'), false);
    assert.equal(output.includes('user:pass'), false);
    assert.equal(output.includes('abc.def.ghi'), false);
    assert.equal(output.includes('visible'), true);
});
