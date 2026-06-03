import express, { Router } from 'express'
import { getNews, postNews, postNewsImages } from '../controller/news/newsController.js'

const router: Router = express.Router();

router.get('/', getNews);
router.post('/images', postNewsImages);
router.post('/', postNews);

export default router;
