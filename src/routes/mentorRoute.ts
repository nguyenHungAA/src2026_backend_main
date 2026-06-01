import express, { Router } from 'express'
import multer from 'multer'
import getMentors from '../controller/getMentors.js'
import submitMentorProfile from '../controller/submitMentorProfile.js'
import uploadMentorAvatar from '../controller/uploadMentorAvatar.js'

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
router.post('/submit', submitMentorProfile);
router.post('/upload-avatar', upload.single('avatar'), uploadMentorAvatar);

export default router;
