import type { NextFunction, Request, Response } from 'express';

const signatures = {
    'image/jpeg': (buffer: Buffer) =>
        buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    'image/png': (buffer: Buffer) =>
        buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/webp': (buffer: Buffer) =>
        buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
} as const;

const readUInt24LE = (buffer: Buffer, offset: number) =>
    buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);

const jpegDimensions = (buffer: Buffer): { width: number; height: number } | null => {
    let offset = 2;
    const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    while (offset + 8 < buffer.length) {
        if (buffer[offset] !== 0xff) return null;
        const marker = buffer[offset + 1];
        if (startOfFrame.has(marker)) {
            return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        const segmentLength = buffer.readUInt16BE(offset + 2);
        if (segmentLength < 2) return null;
        offset += segmentLength + 2;
    }
    return null;
};

const imageDimensions = (file: Express.Multer.File): { width: number; height: number } | null => {
    const buffer = file.buffer;
    if (file.mimetype === 'image/png' && buffer.length >= 24) {
        return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (file.mimetype === 'image/jpeg') return jpegDimensions(buffer);
    if (file.mimetype !== 'image/webp' || buffer.length < 30) return null;

    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
        return { width: readUInt24LE(buffer, 24) + 1, height: readUInt24LE(buffer, 27) + 1 };
    }
    if (chunk === 'VP8L' && buffer[20] === 0x2f) {
        return {
            width: 1 + buffer[21] + ((buffer[22] & 0x3f) << 8),
            height: 1 + ((buffer[22] & 0xc0) >> 6) + (buffer[23] << 2) + ((buffer[24] & 0x0f) << 10),
        };
    }
    if (chunk === 'VP8 ') {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    return null;
};

export const allowedImageMimeTypes = Object.keys(signatures);

const collectFiles = (req: Request): Express.Multer.File[] => {
    if (req.file) return [req.file];
    if (Array.isArray(req.files)) return req.files;
    if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
    return [];
};

export const validateUploadedImages = (req: Request, res: Response, next: NextFunction): void => {
    const maxDimension = Number(process.env.IMAGE_MAX_DIMENSION ?? 8000);
    const maxPixels = Number(process.env.IMAGE_MAX_PIXELS ?? 25_000_000);
    const invalid = collectFiles(req).find((file) => {
        const validate = signatures[file.mimetype as keyof typeof signatures];
        const dimensions = validate?.(file.buffer) ? imageDimensions(file) : null;
        return !dimensions || dimensions.width < 1 || dimensions.height < 1 ||
            dimensions.width > maxDimension || dimensions.height > maxDimension ||
            dimensions.width * dimensions.height > maxPixels;
    });

    if (invalid) {
        res.status(415).json({
            code: 'INVALID_IMAGE_CONTENT',
            message: 'Only valid JPEG, PNG, and WebP images within the dimension limits are allowed.',
            requestId: res.locals.requestId,
        });
        return;
    }

    next();
};
