import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import User from '../model/userModel.js';
import { logger } from '../utils/logger.js';

type AccessTokenPayload = {
    userId: string;
    iat: number;
    exp: number;
    tokenVersion: number;
};

export type AuthenticatedRequest = Request & {
    user?: {
        id: string;
        email: string;
        role: string;
    };
};

const clearAccessCookie = (res: Response) => res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
});

const unauthorized = (res: Response, message = 'Unauthorized') => {
    clearAccessCookie(res);
    return res.status(401).json({ code: 'UNAUTHORIZED', message, requestId: res.locals.requestId });
};


const decodeBase64UrlJson = <Payload>(value: string): Payload | null => {
    try {
        return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Payload;
    } catch {
        return null;
    }
};

const isValidSignature = (
    header: string,
    payload: string,
    signature: string,
    secret: string
) => {
    const expectedSignature = createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(signature);

    return (
        expectedBuffer.length === providedBuffer.length &&
        timingSafeEqual(expectedBuffer, providedBuffer)
    );
};

const readBearerToken = (authorizationHeader?: string) => {
    if (!authorizationHeader) {
        return null;
    }

    const [scheme, token] = authorizationHeader.trim().split(/\s+/);
    if (scheme !== 'Bearer' || !token) {
        return null;
    }

    return token;
};

const readCookieToken = (cookieHeader?: string) => {
    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const accessTokenCookie = cookies.find((cookie) => cookie.startsWith('accessToken='));

    if (!accessTokenCookie) {
        return null;
    }

    return decodeURIComponent(accessTokenCookie.slice('accessToken='.length));
};

export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({ message: 'Authentication is not configured' });
        return;
    }

    const token = readCookieToken(req.headers.cookie) ?? readBearerToken(req.headers.authorization);
    if (!token) {
        unauthorized(res);
        return;
    }

    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature || token.split('.').length !== 3) {
        unauthorized(res, 'Invalid token');
        return;
    }

    const decodedHeader = decodeBase64UrlJson<{ alg?: string; typ?: string }>(header);
    const decodedPayload = decodeBase64UrlJson<AccessTokenPayload>(payload);

    if (
        !decodedHeader ||
        decodedHeader.alg !== 'HS256' ||
        decodedHeader.typ !== 'JWT' ||
        !decodedPayload?.userId ||
        typeof decodedPayload.exp !== 'number'
        || typeof decodedPayload.tokenVersion !== 'number'
    ) {
        unauthorized(res, 'Invalid token');
        return;
    }

    if (!isValidSignature(header, payload, signature, secret)) {
        unauthorized(res, 'Invalid token');
        return;
    }

    if (decodedPayload.exp <= Math.floor(Date.now() / 1000)) {
        unauthorized(res, 'Token has expired');
        return;
    }

    try {
        const user = await User.findById(decodedPayload.userId).lean();
        if (!user || !user.isEmailVerified || user.tokenVersion !== decodedPayload.tokenVersion) {
            unauthorized(res);
            return;
        }

        req.user = {
            id: String(user._id),
            email: user.email,
            role: user.role,
        };

        next();
    } catch (error) {
        logger.error('auth.authentication_failed', error, { requestId: res.locals.requestId });
        res.status(503).json({ code: 'AUTHENTICATION_UNAVAILABLE', message: 'Could not authenticate request', requestId: res.locals.requestId });
    }
};

export type Permission =
    | 'dashboard.read'
    | 'content.read'
    | 'content.update'
    | 'content.publish'
    | 'semesters.manage'
    | 'news.manage'
    | 'news.publish'
    | 'submissions.review'
    | 'mentors.manage'
    | 'publications.manage'
    | 'media.manage'
    | 'audit.read'
    | 'users.manage';

const allPermissions: Permission[] = [
    'dashboard.read',
    'content.read',
    'content.update',
    'content.publish',
    'semesters.manage',
    'news.manage',
    'news.publish',
    'submissions.review',
    'mentors.manage',
    'publications.manage',
    'media.manage',
    'audit.read',
    'users.manage',
];

const rolePermissions: Record<string, Permission[]> = {
    super_admin: allPermissions,
    admin: allPermissions.filter((permission) => permission !== 'users.manage'),
    editor: ['dashboard.read', 'content.read', 'content.update', 'news.manage', 'media.manage'],
    reviewer: ['dashboard.read', 'content.read', 'submissions.review', 'news.manage'],
    contributor: ['dashboard.read', 'content.read', 'content.update', 'news.manage'],
    viewer: ['dashboard.read', 'content.read'],
    user: [],
};

export const hasPermission = (role: string | undefined, permission: Permission): boolean =>
    (rolePermissions[role || ''] ?? []).includes(permission);

export const requirePermission = (permission: Permission) => (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        unauthorized(res);
        return;
    }

    if (!hasPermission(req.user.role, permission)) {
        logger.warn('authorization.denied', {
            requestId: res.locals.requestId,
            permission,
            role: req.user.role,
            actorId: req.user.id,
        });
        res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
        return;
    }

    next();
};
