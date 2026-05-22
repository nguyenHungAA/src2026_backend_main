import express, { Router } from 'express'
import multer from 'multer'
import submitPublication from '../controller/submitPublication.js'
import getPublications from '../controller/getPublications.js'
import getPublicationById from '../controller/getPublicationById.js'
import uploadImage from '../controller/uploadImage.js'
import deleteImage from '../controller/deleteImage.js'

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
router.get('/:id', getPublicationById);
router.post('/submit', submitPublication);
router.post('/upload-image', upload.single('image'), uploadImage);
router.post('/delete-image', deleteImage);

export default router;