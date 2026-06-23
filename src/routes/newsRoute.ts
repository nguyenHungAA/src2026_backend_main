import express, { Router } from 'express'
import multer from 'multer'
import { getNews, getNewsById, postNews, postNewsImages, postNewsThumbNailImage, updateNews } from '../controller/news/newsController.js'
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware.js';

const router: Router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
            return;
        }

        cb(new Error('Only image files are allowed'));
    },
});

router.get('/', getNews);
router.get('/:id', getNewsById);
router.post('/images', authMiddleware, upload.array('images', 10), postNewsImages);
router.post('/thumbnail-image', authMiddleware, upload.single('thumbNailImage'), postNewsThumbNailImage);
router.post(
    '/',
    authMiddleware,
    upload.fields([
        { name: 'thumbNailImage', maxCount: 1 },
        { name: 'images', maxCount: 10 },
    ]),
    postNews
);
router.put(
    '/:id',
    authMiddleware,
    adminMiddleware,
    upload.fields([
        { name: 'thumbNailImage', maxCount: 1 },
        { name: 'images', maxCount: 10 },
    ]),
    updateNews
);

export default router;
