import cloudinary, { assertCloudinaryConfigured } from '../config/cloudinary.js';

export type CloudinaryImageResult = {
    secureUrl: string;
    publicId: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
};

type UploadOptions = {
    folder: string;
    transformation?: Record<string, unknown>[];
};

const providerTimeoutMs = Number(process.env.CLOUDINARY_TIMEOUT_MS ?? 15000);

export const uploadImageBuffer = (
    buffer: Buffer,
    options: UploadOptions,
): Promise<CloudinaryImageResult> => new Promise((resolve, reject) => {
    assertCloudinaryConfigured();
    let settled = false;
    const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        callback();
    };
    const timeoutId = setTimeout(() => {
        finish(() => reject(new Error('Cloudinary upload timed out')));
    }, providerTimeoutMs);

    const stream = cloudinary.uploader.upload_stream(
        {
            folder: options.folder,
            resource_type: 'image',
            transformation: options.transformation,
        },
        (error, result) => finish(() => {
            if (error || !result?.secure_url || !result.public_id) {
                reject(error || new Error('Cloudinary returned an invalid upload result'));
                return;
            }
            resolve({
                secureUrl: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                bytes: result.bytes,
                format: result.format,
            });
        }),
    );

    stream.end(buffer);
});

export const destroyImage = (publicId: string): Promise<string> => new Promise((resolve, reject) => {
    assertCloudinaryConfigured();
    let settled = false;
    const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        callback();
    };
    const timeoutId = setTimeout(() => finish(() => reject(new Error('Cloudinary delete timed out'))), providerTimeoutMs);

    cloudinary.uploader.destroy(publicId, (error, result) => finish(() => {
        if (error) {
            reject(error);
            return;
        }
        resolve(String(result?.result ?? 'unknown'));
    }));
});
