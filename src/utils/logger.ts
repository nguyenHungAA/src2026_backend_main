type LogLevel = 'info' | 'warn' | 'error';

const sensitiveKeyPattern = /authorization|cookie|password|secret|token|api[-_]?key|credential/i;

const sanitizeString = (value: string): string => value
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/:\/\/[^\s/:@]+:[^\s/@]+@/g, '://[REDACTED]@')
    .replace(/\b(password|token|secret|api[-_]?key)=([^\s&]+)/gi, '$1=[REDACTED]');

const sanitize = (value: unknown, depth = 0): unknown => {
    if (depth > 5) return '[TRUNCATED]';
    if (value instanceof Error) {
        return {
            name: value.name,
            message: sanitizeString(value.message),
            stack: process.env.NODE_ENV === 'production' || !value.stack
                ? undefined
                : sanitizeString(value.stack),
        };
    }
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
                key,
                sensitiveKeyPattern.test(key) ? '[REDACTED]' : sanitize(entry, depth + 1),
            ])
        );
    }
    if (typeof value === 'string') {
        const sanitized = sanitizeString(value);
        return sanitized.length > 1000 ? `${sanitized.slice(0, 1000)}...[TRUNCATED]` : sanitized;
    }
    return value;
};

const write = (level: LogLevel, event: string, context: Record<string, unknown> = {}): void => {
    const payload = sanitize({
        timestamp: new Date().toISOString(),
        level,
        event,
        service: 'src2026-backend',
        environment: process.env.NODE_ENV ?? 'development',
        releaseSha: process.env.RELEASE_SHA,
        ...context,
    });
    const line = JSON.stringify(payload);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
};

export const logger = {
    info: (event: string, context?: Record<string, unknown>) => write('info', event, context),
    warn: (event: string, context?: Record<string, unknown>) => write('warn', event, context),
    error: (event: string, error: unknown, context: Record<string, unknown> = {}) =>
        write('error', event, { ...context, error }),
};
