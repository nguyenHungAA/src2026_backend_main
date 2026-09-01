import { createHash, createHmac } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import IdempotencyRecord from '../model/idempotencyRecordModel.js';
import { logger } from '../utils/logger.js';

const KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const RECORD_TTL_MS = 24 * 60 * 60 * 1000;
const PROCESSING_STALE_MS = 2 * 60 * 1000;

const stableValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([key]) => key !== 'turnstileToken')
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, entry]) => [key, stableValue(entry)]),
        );
    }
    return value;
};

const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
const keyDigest = (scope: string, key: string): string => {
    const secret = process.env.IDEMPOTENCY_SECRET ?? process.env.JWT_SECRET;
    if (!secret) throw new Error('IDEMPOTENCY_SECRET or JWT_SECRET is required');
    return createHmac('sha256', secret).update(`${scope}:${key}`).digest('hex');
};

export const idempotency = (scope: string) => async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const payloadHash = digest(JSON.stringify(stableValue(req.body ?? {})));
    const suppliedKey = req.header('idempotency-key');
    const fallbackBucket = Math.floor(Date.now() / (10 * 60 * 1000));
    const key = suppliedKey ?? `legacy:${payloadHash}:${fallbackBucket}`;

    if (!KEY_PATTERN.test(key)) {
        res.status(400).json({
            code: 'INVALID_IDEMPOTENCY_KEY',
            message: 'Idempotency-Key must contain 16-128 safe characters.',
            requestId: res.locals.requestId,
        });
        return;
    }

    try {
        let record;
        let created = false;
        try {
            record = await IdempotencyRecord.create({
                scope,
                keyHash: keyDigest(scope, key),
                payloadHash,
                status: 'processing',
                expiresAt: new Date(Date.now() + RECORD_TTL_MS),
            });
            created = true;
        } catch (error: unknown) {
            if ((error as { code?: number }).code !== 11000) throw error;
            record = await IdempotencyRecord.findOne({ scope, keyHash: keyDigest(scope, key) });
        }

        if (!record) throw new Error('Could not create or load idempotency record');
        if (record.payloadHash !== payloadHash) {
            res.status(409).json({
                code: 'IDEMPOTENCY_CONFLICT',
                message: 'The idempotency key was already used for a different request.',
                requestId: res.locals.requestId,
            });
            return;
        }
        if (record.status === 'completed') {
            logger.info('request.idempotency_replayed', {
                requestId: res.locals.requestId,
                feature: scope,
            });
            res.status(record.responseStatus ?? 200).json(record.responseBody);
            return;
        }

        const ageMs = Date.now() - record.updatedAt.getTime();
        if (!created && ageMs < PROCESSING_STALE_MS) {
            res.setHeader('Retry-After', '2');
            res.status(409).json({
                code: 'REQUEST_IN_PROGRESS',
                message: 'An identical request is already being processed.',
                requestId: res.locals.requestId,
            });
            return;
        }
        if (ageMs >= PROCESSING_STALE_MS) {
            record.updatedAt = new Date();
            await record.save();
        }

        const originalJson = res.json.bind(res);
        res.json = ((body: unknown) => {
            const status = res.statusCode;
            const persist = status >= 500
                ? IdempotencyRecord.deleteOne({ _id: record._id, status: 'processing' })
                : IdempotencyRecord.updateOne(
                    { _id: record._id },
                    { $set: { status: 'completed', responseStatus: status, responseBody: body } },
                );

            void persist
                .catch((error) => logger.error('idempotency.persist_failed', error, {
                    requestId: res.locals.requestId,
                    feature: scope,
                }))
                .finally(() => originalJson(body));
            return res;
        }) as Response['json'];

        next();
    } catch (error) {
        logger.error('idempotency.unavailable', error, {
            requestId: res.locals.requestId,
            feature: scope,
        });
        res.status(503).json({
            code: 'IDEMPOTENCY_UNAVAILABLE',
            message: 'Safe submission processing is temporarily unavailable. Please try again.',
            requestId: res.locals.requestId,
        });
    }
};
