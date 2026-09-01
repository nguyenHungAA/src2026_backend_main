import express, { Router } from 'express'
import multer from 'multer'
import getMentors from '../controller/mentors/getMentors.js'
import submitMentorProfile from '../controller/mentors/submitMentorProfile.js'
import uploadMentorAvatar from '../controller/mentors/uploadMentorAvatar.js'
import verifyTurnstile from '../middleware/verifyTurnstile.js'
import {
    approvePendingMentor,
    createAdminMentor,
    deleteAdminMentor,
    declinePendingMentor,
    getAdminMentorById,
    getAdminMentors,
    getPendingMentors,
    updateAdminMentor,
} from '../controller/mentors/adminMentors.js'
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js'
import { publicCache } from '../middleware/httpPolicy.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { idempotency } from '../middleware/idempotency.js'
import { allowedImageMimeTypes, validateUploadedImages } from '../middleware/imageValidation.js'

const router: Router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (allowedImageMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('UNSUPPORTED_IMAGE_TYPE'));
        }
    },
});

router.get('/', publicCache(), getMentors);
router.get('/admin', authMiddleware, requirePermission('mentors.manage'), getAdminMentors);
router.post('/admin', authMiddleware, requirePermission('mentors.manage'), createAdminMentor);
router.get('/admin/:id', authMiddleware, requirePermission('mentors.manage'), getAdminMentorById);
router.put('/admin/:id', authMiddleware, requirePermission('mentors.manage'), updateAdminMentor);
router.delete('/admin/:id', authMiddleware, requirePermission('mentors.manage'), deleteAdminMentor);
router.get('/pending', authMiddleware, requirePermission('submissions.review'), getPendingMentors);
router.post('/pending/:id/approve', authMiddleware, requirePermission('submissions.review'), approvePendingMentor);
router.delete('/pending/:id', authMiddleware, requirePermission('submissions.review'), declinePendingMentor);
router.post(
    '/submit',
    rateLimit({ scope: 'mentor.submit', limit: 5, windowMs: 10 * 60 * 1000 }),
    verifyTurnstile,
    idempotency('mentor.submit'),
    submitMentorProfile,
);
router.post(
    '/upload-avatar',
    authMiddleware,
    requirePermission('mentors.manage'),
    rateLimit({ scope: 'mentor.upload', limit: 10, windowMs: 10 * 60 * 1000 }),
    upload.single('avatar'),
    validateUploadedImages,
    uploadMentorAvatar,
);

export default router;
