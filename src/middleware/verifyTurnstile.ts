import { NextFunction, Request, Response } from 'express';

type TurnstileVerifyResponse = {
    success: boolean;
    'error-codes'?: string[];
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
        res.status(400).json({ message: 'Please complete bot verification before submitting.' });
        return;
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        res.status(500).json({ message: 'Turnstile is not configured on the server.' });
        return;
    }

    try {
        const response = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret,
                response: token,
                remoteip: getClientIp(req),
            }),
        });

        const result = await response.json() as TurnstileVerifyResponse;
        if (!result.success) {
            res.status(403).json({
                message: 'Bot verification failed. Please refresh and try again.',
                errors: result['error-codes'] ?? [],
            });
            return;
        }

        delete req.body.turnstileToken;
        next();
    } catch (error) {
        console.error('Turnstile verification error:', error);
        res.status(502).json({ message: 'Could not verify Turnstile token. Please try again.' });
    }
};

export default verifyTurnstile;
