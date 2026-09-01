import { createHmac } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import RateLimitBucket from '../model/rateLimitBucketModel.js';
import { logger } from '../utils/logger.js';

type RateLimitOptions = {
    scope: string;
    limit: number;
    windowMs: number;
    identity?: (req: Request) => string;
};

const hashIdentity = (value: string): string => {
    const secret = process.env.RATE_LIMIT_SECRET ?? process.env.JWT_SECRET;
    if (!secret) throw new Error('RATE_LIMIT_SECRET or JWT_SECRET is required');
    return createHmac('sha256', secret).update(value).digest('hex');
};

const incrementBucket = async (
    scope: string,
    keyHash: string,
    bucket: number,
    expiresAt: Date,
) => {
    try {
        return await RateLimitBucket.findOneAndUpdate(
            { scope, keyHash, bucket },
            { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        ).lean();
    } catch (error: unknown) {
        if ((error as { code?: number }).code !== 11000) throw error;
        return RateLimitBucket.findOneAndUpdate(
            { scope, keyHash, bucket },
            { $inc: { count: 1 } },
            { new: true },
        ).lean();
    }
};

export const rateLimit = ({ scope, limit, windowMs, identity }: RateLimitOptions) => async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const identityValue = identity?.(req) || req.ip || 'unknown';
        const keyHash = hashIdentity(identityValue.toLowerCase());
        const now = Date.now();
        const bucket = Math.floor(now / windowMs);
        const resetAt = (bucket + 1) * windowMs;
        const record = await incrementBucket(scope, keyHash, bucket, new Date(resetAt + windowMs));
        const remaining = Math.max(0, limit - (record?.count ?? limit));

        res.setHeader('RateLimit-Limit', String(limit));
        res.setHeader('RateLimit-Remaining', String(remaining));
        res.setHeader('RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

        if ((record?.count ?? limit + 1) > limit) {
            const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
            res.setHeader('Retry-After', String(retryAfter));
            logger.warn('request.rate_limited', {
                requestId: res.locals.requestId,
                feature: scope,
                retryAfterSeconds: retryAfter,
            });
            res.status(429).json({
                code: 'RATE_LIMITED',
                message: 'Too many requests. Please try again later.',
                retryAfter,
                requestId: res.locals.requestId,
            });
            return;
        }

        next();
    } catch (error) {
        logger.error('rate_limit.unavailable', error, {
            requestId: res.locals.requestId,
            feature: scope,
        });
        res.status(503).json({
            code: 'RATE_LIMIT_UNAVAILABLE',
            message: 'Request protection is temporarily unavailable. Please try again.',
            requestId: res.locals.requestId,
        });
    }
};
