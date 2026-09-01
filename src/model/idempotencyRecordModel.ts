import mongoose, { Schema } from 'mongoose';

export type IdempotencyStatus = 'processing' | 'completed';

export type IdempotencyRecordDocument = {
    scope: string;
    keyHash: string;
    payloadHash: string;
    status: IdempotencyStatus;
    responseStatus?: number;
    responseBody?: unknown;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
};

const idempotencyRecordSchema = new Schema<IdempotencyRecordDocument>({
    scope: { type: String, required: true },
    keyHash: { type: String, required: true },
    payloadHash: { type: String, required: true },
    status: { type: String, enum: ['processing', 'completed'], required: true },
    responseStatus: Number,
    responseBody: Schema.Types.Mixed,
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

idempotencyRecordSchema.index({ scope: 1, keyHash: 1 }, { unique: true });
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const operationsDb = mongoose.connection.useDb('operationsDb');
const IdempotencyRecord = operationsDb.model<IdempotencyRecordDocument>(
    'IdempotencyRecord',
    idempotencyRecordSchema,
    'idempotencyRecords',
);

export default IdempotencyRecord;
