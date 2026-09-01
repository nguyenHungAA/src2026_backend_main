import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import EmailOutbox, { type EmailEventType } from '../model/emailOutboxModel.js';
import {
    sendMentorProfileEmail,
    sendPublicationEmail,
    sendRegistrationEmail,
    sendSignupConfirmationEmail,
    type MentorProfileEmailData,
    type PublicationEmailData,
    type RegistrationEmailData,
    type SignupEmailData,
} from './emailService.js';
import { logger } from '../utils/logger.js';

const maxAttempts = Number(process.env.EMAIL_MAX_ATTEMPTS ?? 5);
const staleLockMs = 5 * 60 * 1000;

const encryptionKey = (): Buffer => {
    const value = process.env.EMAIL_OUTBOX_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
    if (!value) throw new Error('EMAIL_OUTBOX_ENCRYPTION_KEY is required');
    return createHash('sha256').update(value).digest();
};

const encrypt = (payload: unknown): string => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
};

const decrypt = <Payload>(value: string): Payload => {
    const [ivValue, tagValue, encryptedValue] = value.split('.');
    if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid encrypted email payload');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, 'base64url')),
        decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8')) as Payload;
};

export const enqueueEmail = async (
    eventType: EmailEventType,
    aggregateId: string,
    payload: unknown,
    eventKey = `${eventType}:${aggregateId}`,
): Promise<void> => {
    try {
        await EmailOutbox.create({
            eventKey,
            eventType,
            aggregateId,
            encryptedPayload: encrypt(payload),
            status: 'pending',
            attempts: 0,
            nextAttemptAt: new Date(),
        });
    } catch (error: unknown) {
        if ((error as { code?: number }).code !== 11000) throw error;
    }

    queueMicrotask(() => {
        void processPendingEmails(3).catch((error) => logger.error('email.worker_failed', error));
    });
};

const deliver = async (eventType: EmailEventType, payload: unknown): Promise<void> => {
    if (eventType === 'auth.signup_confirmation') return sendSignupConfirmationEmail(payload as SignupEmailData);
    if (eventType === 'publication.submitted') return sendPublicationEmail(payload as PublicationEmailData);
    if (eventType === 'mentor.submitted') return sendMentorProfileEmail(payload as MentorProfileEmailData);
    return sendRegistrationEmail(payload as RegistrationEmailData);
};

export const processPendingEmails = async (limit = 10): Promise<{ processed: number; sent: number; failed: number }> => {
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 10, 1), 50);
    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (let index = 0; index < safeLimit; index += 1) {
        const now = new Date();
        const job = await EmailOutbox.findOneAndUpdate(
            {
                $or: [
                    { status: { $in: ['pending', 'failed'] }, nextAttemptAt: { $lte: now } },
                    { status: 'processing', lockedAt: { $lte: new Date(Date.now() - staleLockMs) } },
                ],
            },
            { $set: { status: 'processing', lockedAt: now }, $inc: { attempts: 1 } },
            { sort: { nextAttemptAt: 1 }, new: true },
        ).select('+encryptedPayload');

        if (!job) break;
        processed += 1;

        try {
            await deliver(job.eventType, decrypt(job.encryptedPayload));
            job.status = 'sent';
            job.sentAt = new Date();
            job.lockedAt = undefined;
            job.lastErrorCode = undefined;
            await job.save();
            sent += 1;
            logger.info('email.sent', { eventType: job.eventType, aggregateId: job.aggregateId, attempts: job.attempts });
        } catch (error) {
            const isDead = job.attempts >= maxAttempts;
            job.status = isDead ? 'dead' : 'failed';
            job.lockedAt = undefined;
            job.lastErrorCode = error instanceof Error ? error.name || 'EMAIL_SEND_FAILED' : 'EMAIL_SEND_FAILED';
            job.nextAttemptAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 30_000 * (2 ** Math.max(0, job.attempts - 1))));
            await job.save();
            failed += 1;
            logger.error('email.send_failed', error, {
                eventType: job.eventType,
                aggregateId: job.aggregateId,
                attempts: job.attempts,
                deadLetter: isDead,
            });
        }
    }

    return { processed, sent, failed };
};
