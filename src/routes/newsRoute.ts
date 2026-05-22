import express, { Router } from 'express'
import getNews from '../controller/getNews.js'

const router: Router = express.Router();

router.get('/', getNews);

export default router;
