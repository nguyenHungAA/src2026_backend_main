import { Request, Response } from 'express';
import Publication, { PendingPublication } from '../model/publicationModel.js';
import { destroyImage } from '../service/cloudinaryService.js';
import { logger } from '../utils/logger.js';
import { removeRegisteredAsset } from '../service/mediaAssetService.js';

const deleteImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { publicId } = req.body;

        if (typeof publicId !== 'string' || !/^src2026\/publications\/[A-Za-z0-9_-]+$/.test(publicId)) {
            res.status(400).json({ message: 'publicId is required' });
            return;
        }

        const references = await Promise.all([
            Publication.countDocuments({ 'images.publicId': publicId }),
            PendingPublication.countDocuments({ 'images.publicId': publicId }),
        ]);
        if (references.some((count) => count > 0)) {
            res.status(409).json({ code: 'ASSET_IN_USE', message: 'Image is still referenced and cannot be deleted.' });
            return;
        }

        const result = await destroyImage(publicId);

        if (result === 'ok' || result === 'not found') {
            await removeRegisteredAsset(publicId);
            res.status(200).json({ message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ message: 'Image not found on Cloudinary' });
        }
    } catch (error) {
        logger.error('cloudinary.delete_failed', error, {
            requestId: res.locals.requestId,
            feature: 'publication.delete_image',
        });
        res.status(502).json({ code: 'UPLOAD_PROVIDER_UNAVAILABLE', message: 'Image deletion failed', requestId: res.locals.requestId });
    }
};

export default deleteImage;
