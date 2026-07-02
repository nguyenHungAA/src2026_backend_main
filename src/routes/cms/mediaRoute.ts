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

const router: Router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
            return;
        }

        cb(new Error('Only image files are allowed'));
    },
});

router.use(authMiddleware);
router.get('/', requirePermission('media.manage'), getMediaAssets);
router.post('/', requirePermission('media.manage'), upload.single('file'), uploadMediaAsset);
router.patch('/:id', requirePermission('media.manage'), updateMediaAsset);
router.delete('/:id', requirePermission('media.manage'), deleteMediaAsset);
router.get('/:id/usages', requirePermission('media.manage'), getMediaAssetUsages);

export default router;
