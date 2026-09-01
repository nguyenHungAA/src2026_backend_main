import mongoose, { Schema } from 'mongoose';

export type EmailEventType = 'auth.signup_confirmation' | 'publication.submitted' | 'mentor.submitted' | 'registration.submitted';
export type EmailOutboxStatus = 'pending' | 'processing' | 'failed' | 'sent' | 'dead';

export type EmailOutboxDocument = {
    eventKey: string;
    eventType: EmailEventType;
    aggregateId: string;
    encryptedPayload: string;
    status: EmailOutboxStatus;
    attempts: number;
    nextAttemptAt: Date;
    lockedAt?: Date;
    lastErrorCode?: string;
    sentAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};

const emailOutboxSchema = new Schema<EmailOutboxDocument>({
    eventKey: { type: String, required: true, unique: true },
    eventType: {
        type: String,
        enum: ['auth.signup_confirmation', 'publication.submitted', 'mentor.submitted', 'registration.submitted'],
        required: true,
    },
    aggregateId: { type: String, required: true, index: true },
    encryptedPayload: { type: String, required: true, select: false },
    status: { type: String, enum: ['pending', 'processing', 'failed', 'sent', 'dead'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedAt: Date,
    lastErrorCode: String,
    sentAt: Date,
}, { timestamps: true });

emailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
emailOutboxSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const operationsDb = mongoose.connection.useDb('operationsDb');
const EmailOutbox = operationsDb.model<EmailOutboxDocument>('EmailOutbox', emailOutboxSchema, 'emailOutbox');

export default EmailOutbox;
