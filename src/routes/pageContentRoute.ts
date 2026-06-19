import express, { Router } from 'express'
import {
    createPageContentVersion,
    getPageContent,
    getPageContentVersions,
    loadDefaultPageContent,
    updatePageContent,
} from '../controller/pageContent/pageContent.js';

const router: Router = express.Router();

router.get('/', getPageContent);
router.put('/', updatePageContent);
router.post('/default', loadDefaultPageContent);
router.get('/versions', getPageContentVersions);
router.post('/versions', createPageContentVersion);

export default router;
