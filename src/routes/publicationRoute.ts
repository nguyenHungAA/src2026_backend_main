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
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware.js'

const router: Router = express.Router();

// Multer config: memory storage (buffer), 5MB limit, images only
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

router.get('/', getPublications);
router.get('/admin', authMiddleware, adminMiddleware, getAdminPublications);
router.post('/admin', authMiddleware, adminMiddleware, createAdminPublication);
router.get('/admin/:id', authMiddleware, adminMiddleware, getAdminPublicationById);
router.put('/admin/:id', authMiddleware, adminMiddleware, updateAdminPublication);
router.delete('/admin/:id', authMiddleware, adminMiddleware, deleteAdminPublication);
router.get('/pending', authMiddleware, adminMiddleware, getPendingPublications);
router.post('/pending/:id/approve', authMiddleware, adminMiddleware, approvePendingPublication);
router.delete('/pending/:id', authMiddleware, adminMiddleware, declinePendingPublication);
router.get('/:id', getPublicationById);
router.post('/submit', verifyTurnstile, submitPublication);
router.post('/upload-image', upload.single('image'), uploadImage);
router.post('/delete-image', deleteImage);

export default router;
