import express, { Router } from 'express'
import multer from 'multer'
import { deleteNews, getAdminNews, getAdminNewsById, getNews, getNewsById, getRelatedNews, postNews, postNewsImages, postNewsThumbNailImage, updateNews } from '../controller/news/newsController.js'
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js';
import { publicCache } from '../middleware/httpPolicy.js';
import { allowedImageMimeTypes, validateUploadedImages } from '../middleware/imageValidation.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router: Router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (allowedImageMimeTypes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new Error('UNSUPPORTED_IMAGE_TYPE'));
    },
});

router.get('/', publicCache(), getNews);
router.get('/admin', authMiddleware, requirePermission('news.manage'), getAdminNews);
router.get('/admin/:id', authMiddleware, requirePermission('news.manage'), getAdminNewsById);
router.get('/:id/related', publicCache(), getRelatedNews);
router.get('/:id', publicCache(), getNewsById);
router.post('/images', authMiddleware, requirePermission('news.manage'), rateLimit({ scope: 'news.images.upload', limit: 20, windowMs: 10 * 60 * 1000 }), upload.array('images', 10), validateUploadedImages, postNewsImages);
router.post('/thumbnail-image', authMiddleware, requirePermission('news.manage'), rateLimit({ scope: 'news.thumbnail.upload', limit: 20, windowMs: 10 * 60 * 1000 }), upload.single('thumbNailImage'), validateUploadedImages, postNewsThumbNailImage);
router.post(
    '/',
    authMiddleware,
    requirePermission('news.manage'),
    rateLimit({ scope: 'news.create', limit: 30, windowMs: 10 * 60 * 1000 }),
    upload.fields([
        { name: 'thumbNailImage', maxCount: 1 },
        { name: 'images', maxCount: 10 },
    ]),
    validateUploadedImages,
    postNews
);
router.put(
    '/:id',
    authMiddleware,
    requirePermission('news.manage'),
    rateLimit({ scope: 'news.update', limit: 60, windowMs: 10 * 60 * 1000 }),
    upload.fields([
        { name: 'thumbNailImage', maxCount: 1 },
        { name: 'images', maxCount: 10 },
    ]),
    validateUploadedImages,
    updateNews
);

router.delete('/:id', authMiddleware, requirePermission('news.manage'), deleteNews);

export default router;
