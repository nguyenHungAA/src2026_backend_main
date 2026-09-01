import express, { Router } from 'express'
import multer from 'multer'
import submitPublication from '../controller/publication/submitPublication.js'
import getPublications from '../controller/publication/getPublications.js'
import getPublicationById from '../controller/publication/getPublicationById.js'
import uploadImage from '../controller/uploadImage.js'
import deleteImage from '../controller/deleteImage.js'
import verifyTurnstile from '../middleware/verifyTurnstile.js'
import {
    approvePendingPublication,
    createAdminPublication,
    deleteAdminPublication,
    declinePendingPublication,
    getAdminPublicationById,
    getAdminPublications,
    getPendingPublications,
    updateAdminPublication,
} from '../controller/publication/adminPublications.js'
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js'
import { publicCache } from '../middleware/httpPolicy.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { idempotency } from '../middleware/idempotency.js'
import { allowedImageMimeTypes, validateUploadedImages } from '../middleware/imageValidation.js'

const router: Router = express.Router();

// Multer config: memory storage (buffer), 5MB limit, images only
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (allowedImageMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('UNSUPPORTED_IMAGE_TYPE'));
        }
    },
});

router.get('/', publicCache(), getPublications);
router.get('/admin', authMiddleware, requirePermission('publications.manage'), getAdminPublications);
router.post('/admin', authMiddleware, requirePermission('publications.manage'), createAdminPublication);
router.get('/admin/:id', authMiddleware, requirePermission('publications.manage'), getAdminPublicationById);
router.put('/admin/:id', authMiddleware, requirePermission('publications.manage'), updateAdminPublication);
router.delete('/admin/:id', authMiddleware, requirePermission('publications.manage'), deleteAdminPublication);
router.get('/pending', authMiddleware, requirePermission('submissions.review'), getPendingPublications);
router.post('/pending/:id/approve', authMiddleware, requirePermission('submissions.review'), approvePendingPublication);
router.delete('/pending/:id', authMiddleware, requirePermission('submissions.review'), declinePendingPublication);
router.get('/:id', publicCache(), getPublicationById);
router.post(
    '/submit',
    rateLimit({ scope: 'publication.submit', limit: 5, windowMs: 10 * 60 * 1000 }),
    verifyTurnstile,
    idempotency('publication.submit'),
    submitPublication,
);
router.post(
    '/upload-image',
    authMiddleware,
    requirePermission('publications.manage'),
    rateLimit({ scope: 'publication.upload', limit: 10, windowMs: 10 * 60 * 1000 }),
    upload.single('image'),
    validateUploadedImages,
    uploadImage,
);
router.post('/delete-image', authMiddleware, requirePermission('publications.manage'), deleteImage);

export default router;
