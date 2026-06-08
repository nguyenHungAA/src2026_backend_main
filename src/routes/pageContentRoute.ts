import express, { Router } from 'express'
import { getPageContent, loadDefaultPageContent, updatePageContent } from '../controller/pageContent/pageContent.js';

const router: Router = express.Router();

router.get('/', getPageContent);
router.put('/', updatePageContent);
router.post('/default', loadDefaultPageContent);

export default router;
