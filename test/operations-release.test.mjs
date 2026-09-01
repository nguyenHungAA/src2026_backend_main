import assert from 'node:assert/strict';
import test from 'node:test';
import { runMaintenance } from '../dist/controller/maintenanceController.js';
import EmailOutbox from '../dist/model/emailOutboxModel.js';
import { enqueueEmail, processPendingEmails } from '../dist/service/emailOutboxService.js';
import { createRequest, createResponse, flushTasks } from './helpers.mjs';

test('email outbox encrypts payloads and schedules a retry when delivery fails', async (t) => {
    process.env.EMAIL_OUTBOX_ENCRYPTION_KEY = 'release-test-outbox-key-at-least-32-characters';
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;

    const originals = {
        create: EmailOutbox.create,
        findOneAndUpdate: EmailOutbox.findOneAndUpdate,
    };
    t.after(() => Object.assign(EmailOutbox, originals));

    let queued;
    EmailOutbox.create = async (record) => { queued = record; return record; };
    EmailOutbox.findOneAndUpdate = () => ({ select: async () => null });
    await enqueueEmail(
        'registration.submitted',
        'registration-release-1',
        {
            referenceId: 'registration-release-1',
            submittedAt: new Date().toISOString(),
            name: 'Release Attendee',
            email: 'attendee@example.com',
            topic: 'Release testing',
            field: 'Software Engineering',
            mentor: 'Release Mentor',
        },
    );
    await flushTasks();

    assert.equal(queued.status, 'pending');
    assert.equal(queued.encryptedPayload.includes('attendee@example.com'), false);
    const beforeRetry = Date.now();
    const job = {
        ...queued,
        _id: 'outbox-release-1',
        attempts: 1,
        async save() { return this; },
    };
    let calls = 0;
    EmailOutbox.findOneAndUpdate = () => ({ select: async () => calls++ === 0 ? job : null });

    const summary = await processPendingEmails(2);
    assert.deepEqual(summary, { processed: 1, sent: 0, failed: 1 });
    assert.equal(job.status, 'failed');
    assert.equal(job.lastErrorCode, 'Error');
    assert.ok(job.nextAttemptAt.getTime() > beforeRetry);
});

test('maintenance cron rejects missing and incorrect bearer credentials', async () => {
    process.env.CRON_SECRET = 'release-cron-secret';
    for (const authorization of [undefined, 'Bearer wrong-secret']) {
        const response = createResponse();
        await runMaintenance(
            createRequest({ method: 'GET', headers: authorization ? { authorization } : {} }),
            response.res,
        );
        assert.equal(response.state.statusCode, 401);
        assert.equal(response.state.body.code, 'UNAUTHORIZED');
    }
});
