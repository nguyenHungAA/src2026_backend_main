import express, { Router } from 'express';
import multer from 'multer';
import {
    deleteMediaAsset,
    getMediaAssets,
    getMediaAssetUsages,
    updateMediaAsset,
    uploadMediaAsset,
} from '../../controller/cms/mediaController.js';
import { authMiddleware, requirePermission } from '../../middleware/authMiddleware.js';
import { allowedImageMimeTypes, validateUploadedImages } from '../../middleware/imageValidation.js';
import { rateLimit } from '../../middleware/rateLimit.js';

const router: Router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (allowedImageMimeTypes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new Error('UNSUPPORTED_IMAGE_TYPE'));
    },
});

router.use(authMiddleware);
router.get('/', requirePermission('media.manage'), getMediaAssets);
router.post(
    '/',
    requirePermission('media.manage'),
    rateLimit({ scope: 'cms.media.upload', limit: 10, windowMs: 10 * 60 * 1000 }),
    upload.single('file'),
    validateUploadedImages,
    uploadMediaAsset,
);
router.patch('/:id', requirePermission('media.manage'), updateMediaAsset);
router.delete('/:id', requirePermission('media.manage'), deleteMediaAsset);
router.get('/:id/usages', requirePermission('media.manage'), getMediaAssetUsages);

export default router;
