import mongoose, { Schema } from 'mongoose';

type RateLimitBucketDocument = {
    scope: string;
    keyHash: string;
    bucket: number;
    count: number;
    expiresAt: Date;
};

const rateLimitBucketSchema = new Schema<RateLimitBucketDocument>({
    scope: { type: String, required: true },
    keyHash: { type: String, required: true },
    bucket: { type: Number, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
}, { versionKey: false });

rateLimitBucketSchema.index({ scope: 1, keyHash: 1, bucket: 1 }, { unique: true });
rateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const operationsDb = mongoose.connection.useDb('operationsDb');
const RateLimitBucket = operationsDb.model<RateLimitBucketDocument>(
    'RateLimitBucket',
    rateLimitBucketSchema,
    'rateLimitBuckets',
);

export default RateLimitBucket;
