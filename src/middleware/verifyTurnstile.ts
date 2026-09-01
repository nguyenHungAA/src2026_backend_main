import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

type TurnstileVerifyResponse = {
    success: boolean;
    'error-codes'?: string[];
    hostname?: string;
    action?: string;
};

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const getClientIp = (req: Request): string | undefined => {
    const forwardedFor = req.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string') {
        return forwardedFor.split(',')[0]?.trim();
    }

    return req.ip;
};

const verifyTurnstile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.body?.turnstileToken;

    if (!token || typeof token !== 'string') {
        logger.warn('submission.turnstile_rejected', {
            requestId: res.locals.requestId,
            route: req.path,
            reason: 'missing_token',
        });
        res.status(400).json({ message: 'Please complete bot verification before submitting.' });
        return;
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        res.status(500).json({ message: 'Turnstile is not configured on the server.' });
        return;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        let response: globalThis.Response;
        try {
            response = await fetch(SITEVERIFY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    secret,
                    response: token,
                    remoteip: getClientIp(req),
                }),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            logger.warn('dependency.request_failed', {
                requestId: res.locals.requestId,
                dependency: 'turnstile',
                statusCode: response.status,
            });
            res.status(502).json({
                code: 'TURNSTILE_UNAVAILABLE',
                message: 'Could not verify bot protection. Please try again.',
            });
            return;
        }

        const result = await response.json() as TurnstileVerifyResponse;
        const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME;
        const expectedAction = process.env.TURNSTILE_EXPECTED_ACTION;
        if (
            !result.success ||
            (expectedHostname && result.hostname !== expectedHostname) ||
            (expectedAction && result.action !== expectedAction)
        ) {
            logger.warn('submission.turnstile_rejected', {
                requestId: res.locals.requestId,
                route: req.path,
                reason: 'verification_failed',
                providerCodes: result['error-codes'] ?? [],
            });
            res.status(403).json({
                code: 'TURNSTILE_INVALID',
                message: 'Bot verification failed. Please refresh and try again.',
            });
            return;
        }

        delete req.body.turnstileToken;
        next();
    } catch (error) {
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        logger.error('dependency.request_failed', error, {
            requestId: res.locals.requestId,
            dependency: 'turnstile',
            timeout: isTimeout,
        });
        res.status(503).json({
            code: isTimeout ? 'TURNSTILE_TIMEOUT' : 'TURNSTILE_UNAVAILABLE',
            message: 'Could not verify Turnstile token. Please try again.',
        });
    }
};

export default verifyTurnstile;
