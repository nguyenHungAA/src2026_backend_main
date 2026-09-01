import dotenv from 'dotenv';

dotenv.config();

const requiredProductionValues = [
    'MONGO_URI',
    'JWT_SECRET',
    'RATE_LIMIT_SECRET',
    'IDEMPOTENCY_SECRET',
    'EMAIL_OUTBOX_ENCRYPTION_KEY',
    'CRON_SECRET',
    'TURNSTILE_SECRET_KEY',
    'TURNSTILE_EXPECTED_HOSTNAME',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    'NOTIFY_EMAIL',
    'FRONTEND_ORIGIN',
    'BACKEND_URL',
] as const;

const strongSecretKeys = [
    'JWT_SECRET',
    'RATE_LIMIT_SECRET',
    'IDEMPOTENCY_SECRET',
    'EMAIL_OUTBOX_ENCRYPTION_KEY',
    'CRON_SECRET',
] as const;

export const validateEnvironment = (): void => {
    if (process.env.NODE_ENV !== 'production') return;

    const missing = requiredProductionValues.filter((key) => !process.env[key]?.trim());
    const weak = strongSecretKeys.filter((key) => (process.env[key]?.length ?? 0) < 32);
    const invalidUrls = ['FRONTEND_ORIGIN', 'BACKEND_URL'].filter((key) => {
        try {
            return new URL(String(process.env[key])).protocol !== 'https:';
        } catch {
            return true;
        }
    });

    if (missing.length || weak.length || invalidUrls.length) {
        const parts = [
            missing.length ? `missing: ${missing.join(', ')}` : '',
            weak.length ? `weak secrets: ${weak.join(', ')}` : '',
            invalidUrls.length ? `invalid HTTPS URLs: ${invalidUrls.join(', ')}` : '',
        ].filter(Boolean);
        throw new Error(`Production environment validation failed (${parts.join('; ')})`);
    }
};
