import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

const requestIdPattern = /^[A-Za-z0-9._-]{1,128}$/;

export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
    const suppliedRequestId = req.header('x-request-id');
    const requestId = suppliedRequestId && requestIdPattern.test(suppliedRequestId)
        ? suppliedRequestId
        : randomUUID();

    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    const startedAt = process.hrtime.bigint();
    res.once('finish', () => {
        logger.info('http.request_completed', {
            requestId,
            method: req.method,
            route: req.route?.path ?? req.path,
            statusCode: res.statusCode,
            durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
        });
    });
    next();
};

export const publicCache = (maxAgeSeconds = 60, staleSeconds = 300) => (
    _req: Request,
    res: Response,
    next: NextFunction,
): void => {
    res.setHeader(
        'Cache-Control',
        `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleSeconds}`,
    );
    next();
};

export const privateNoStore = (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
};

export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        code: 'NOT_FOUND',
        message: 'API endpoint not found',
        requestId: res.locals.requestId,
        path: req.path,
    });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    logger.error('http.unhandled_error', error, { requestId: res.locals.requestId });
    if (res.headersSent) return;

    const isPayloadTooLarge = typeof error === 'object' && error !== null &&
        'type' in error && error.type === 'entity.too.large';
    const isFileTooLarge = typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'LIMIT_FILE_SIZE';
    const isUnsupportedFile = error instanceof Error && error.message === 'UNSUPPORTED_IMAGE_TYPE';
    const status = isPayloadTooLarge || isFileTooLarge ? 413 : isUnsupportedFile ? 415 : 500;

    res.status(status).json({
        code: isPayloadTooLarge ? 'PAYLOAD_TOO_LARGE'
            : isFileTooLarge ? 'FILE_TOO_LARGE'
                : isUnsupportedFile ? 'UNSUPPORTED_IMAGE_TYPE'
                    : 'INTERNAL_ERROR',
        message: isPayloadTooLarge ? 'Request payload is too large'
            : isFileTooLarge ? 'Image file is too large'
                : isUnsupportedFile ? 'Only JPEG, PNG, and WebP images are allowed'
                    : 'Request could not be processed',
        requestId: res.locals.requestId,
    });
};
