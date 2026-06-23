import express, { Router } from 'express'
import multer from 'multer'
import getMentors from '../controller/mentors/getMentors.js'
import submitMentorProfile from '../controller/mentors/submitMentorProfile.js'
import uploadMentorAvatar from '../controller/mentors/uploadMentorAvatar.js'
import verifyTurnstile from '../middleware/verifyTurnstile.js'
import {
    approvePendingMentor,
    declinePendingMentor,
    getPendingMentors,
} from '../controller/mentors/adminMentors.js'
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware.js'

const router: Router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

router.get('/', getMentors);
router.get('/pending', authMiddleware, adminMiddleware, getPendingMentors);
router.post('/pending/:id/approve', authMiddleware, adminMiddleware, approvePendingMentor);
router.delete('/pending/:id', authMiddleware, adminMiddleware, declinePendingMentor);
router.post('/submit', verifyTurnstile, submitMentorProfile);
router.post('/upload-avatar', upload.single('avatar'), uploadMentorAvatar);

export default router;
