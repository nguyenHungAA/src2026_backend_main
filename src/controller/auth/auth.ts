import {
    createHash,
    createHmac,
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { Request, Response } from 'express';
import User from '../../model/userModel.js';
import { sendSignupConfirmationEmail } from '../../service/emailService.js';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware.js';

const scrypt = promisify(scryptCallback);
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000 * 60; // 60 days in milliseconds
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000 * 720;

const getAccessTokenCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' as const : 'lax' as const,
        maxAge: ACCESS_TOKEN_TTL_MS,
        path: '/',
    };
};

const hashToken = (token: string): string =>
    createHash('sha256').update(token).digest('hex');

const hashPassword = async (password: string): Promise<string> => {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scrypt(password, salt, 64) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
};

const verifyPassword = async (password: string, storedPassword: string): Promise<boolean> => {
    const [salt, storedKeyHex, ...extraParts] = storedPassword.split(':');

    if (!salt || !storedKeyHex || extraParts.length > 0) {
        return false;
    }

    const storedKey = Buffer.from(storedKeyHex, 'hex');
    if (storedKey.length !== 64) {
        return false;
    }

    const derivedKey = await scrypt(password, salt, storedKey.length) as Buffer;
    return timingSafeEqual(storedKey, derivedKey);
};

const createAccessToken = (userId: string): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        userId,
        iat: issuedAt,
        exp: issuedAt + 60 * 60,
    })).toString('base64url');
    const signature = createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

    return `${header}.${payload}.${signature}`;
};

const confirmationPage = (title: string, message: string, isSuccess: boolean): string => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            * { box-sizing: border-box; }
            body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                padding: 24px;
                background: #f8fafc;
                color: #1e293b;
                font-family: Arial, sans-serif;
            }
            main {
                max-width: 520px;
                padding: 40px;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                background: #ffffff;
                box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
                text-align: center;
            }
            .icon {
                width: 64px;
                height: 64px;
                display: grid;
                place-items: center;
                margin: 0 auto 20px;
                border-radius: 50%;
                background: ${isSuccess ? '#dcfce7' : '#fee2e2'};
                color: ${isSuccess ? '#15803d' : '#b91c1c'};
                font-size: 32px;
                font-weight: 700;
            }
            h1 { margin: 0 0 12px; font-size: 28px; }
            p { margin: 0; color: #64748b; line-height: 1.6; }
        </style>
    </head>
    <body>
        <main>
            <div class="icon">${isSuccess ? '&#10003;' : '!'}</div>
            <h1>${title}</h1>
            <p>${message}</p>
            You can close this page now.
        </main>
    </body>
    </html>
`;

const signup = async (req: Request, res: Response): Promise<void> => {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');

    if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
    }

    if (!EMAIL_PATTERN.test(email)) {
        res.status(400).json({ message: 'Enter a valid email address' });
        return;
    }

    if (password.length < 6) {
        res.status(400).json({ message: 'Password must be at least 6 characters long' });
        return;
    }

    if (password.length > 128) {
        res.status(400).json({ message: 'Password must not exceed 128 characters' });
        return;
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser?.isEmailVerified) {
            res.status(409).json({ message: 'An account with this email already exists' });
            return;
        }

        const confirmationToken = randomBytes(32).toString('hex');
        const passwordHash = await hashPassword(password);
        const emailVerificationToken = hashToken(confirmationToken);
        const emailVerificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

        if (existingUser) {
            const previousPassword = existingUser.password;
            const previousToken = existingUser.emailVerificationToken;
            const previousExpiresAt = existingUser.emailVerificationExpiresAt;

            existingUser.password = passwordHash;
            existingUser.emailVerificationToken = emailVerificationToken;
            existingUser.emailVerificationExpiresAt = emailVerificationExpiresAt;
            await existingUser.save();

            try {
                await sendSignupConfirmationEmail(email, confirmationToken);
            } catch (error) {
                existingUser.password = previousPassword;
                existingUser.emailVerificationToken = previousToken;
                existingUser.emailVerificationExpiresAt = previousExpiresAt;
                await existingUser.save();
                throw error;
            }

            res.status(200).json({
                message: 'A new confirmation email has been sent. Check your inbox.',
            });
            return;
        }

        const user = await User.create({
            email,
            password: passwordHash,
            emailVerificationToken,
            emailVerificationExpiresAt,
        });

        try {
            await sendSignupConfirmationEmail(email, confirmationToken);
        } catch (error) {
            await User.deleteOne({ _id: user._id });
            throw error;
        }

        res.status(201).json({
            message: 'Signup successful. Check your email to confirm your account.',
        });
    } catch (error: any) {
        if (error?.code === 11000) {
            res.status(409).json({ message: 'An account with this email already exists' });
            return;
        }

        console.error('Signup error:', error);
        res.status(500).json({ message: 'Could not create account' });
    }
};

const confirmEmail = async (req: Request, res: Response): Promise<void> => {
    const token = String(req.query.token ?? '');

    if (!token) {
        res.status(400).send(confirmationPage(
            'Confirmation link is incomplete',
            'The email confirmation token is missing. Please use the complete link from your email.',
            false
        ));
        return;
    }

    try {
        const user = await User.findOne({
            emailVerificationToken: hashToken(token),
            emailVerificationExpiresAt: { $gt: new Date() },
        });

        if (!user) {
            res.status(400).send(confirmationPage(
                'Confirmation link is invalid',
                'This email confirmation link is invalid or has expired. Please sign up again.',
                false
            ));
            return;
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpiresAt = undefined;
        await user.save();

        res.status(200).send(confirmationPage(
            'Signup successful',
            'Your email has been confirmed. You can now log in.',
            true
        ));
    } catch (error) {
        console.error('Email confirmation error:', error);
        res.status(500).send(confirmationPage(
            'Could not confirm email',
            'Something went wrong while confirming your email. Please try again later.',
            false
        ));
    }
};

const login = async (req: Request, res: Response): Promise<void> => {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');

    if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        if (!user.isEmailVerified) {
            res.status(401).json({ message: 'Email not verified' });
            return;
        }

        const token = createAccessToken(String(user._id));
        res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, getAccessTokenCookieOptions());
        res.status(200).json({
            message: 'Logged in',
            user: {
                id: String(user._id),
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Could not log in' });
    }
};

const me = (req: AuthenticatedRequest, res: Response): void => {
    res.status(200).json({ user: req.user });
};

const logout = (_req: Request, res: Response): void => {
    const { maxAge: _maxAge, ...cookieOptions } = getAccessTokenCookieOptions();
    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, cookieOptions);
    res.status(200).json({ message: 'Logged out' });
};

const forgotPassword = (req: Request, res: Response): void => {
    res.status(501).json({ message: 'Forgot password is not implemented yet' });
};

export { signup, confirmEmail, login, me, logout, forgotPassword };
