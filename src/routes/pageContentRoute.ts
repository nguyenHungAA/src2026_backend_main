import express, { Router } from 'express'
import { getPageContent, loadDefaultPageContent, updatePageContent } from '../controller/pageContent/pageContent.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router: Router = express.Router();

router.get('/', getPageContent);
router.put('/', authMiddleware, updatePageContent);
router.post('/default', authMiddleware, loadDefaultPageContent);

export default router;
