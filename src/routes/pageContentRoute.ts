import express, { Router } from 'express'
import { getPageContent, loadDefaultPageContent } from '../controller/getPageContent.js';

const router: Router = express.Router();

router.get('/', getPageContent);
router.post('/default', loadDefaultPageContent);

export default router;
