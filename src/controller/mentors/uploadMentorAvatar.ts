import { Response } from 'express';
import { destroyImage, uploadImageBuffer, type CloudinaryImageResult } from '../../service/cloudinaryService.js';
import { logger } from '../../utils/logger.js';
import { registerLegacyUpload } from '../../service/mediaAssetService.js';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware.js';

const uploadMentorAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let uploaded: CloudinaryImageResult | null = null;
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No image file provided' });
            return;
        }

        const result = await uploadImageBuffer(req.file.buffer, {
            folder: 'src2026/mentors',
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' },
            ],
        });
        uploaded = result;
        await registerLegacyUpload(result, req.file, 'mentor_upload', req.user?.id);

        res.status(200).json({
            message: 'Avatar uploaded successfully',
            data: {
                url: result.secureUrl,
                publicId: result.publicId,
            },
        });
    } catch (error) {
        if (uploaded) {
            await destroyImage(uploaded.publicId).catch((cleanupError) => logger.error('media.compensation_failed', cleanupError, {
                requestId: res.locals.requestId,
                publicId: uploaded?.publicId,
            }));
        }
        logger.error('cloudinary.upload_failed', error, {
            requestId: res.locals.requestId,
            feature: 'mentor.upload',
        });
        res.status(502).json({ code: 'UPLOAD_PROVIDER_UNAVAILABLE', message: 'Avatar upload failed', requestId: res.locals.requestId });
    }
};

export default uploadMentorAvatar;
