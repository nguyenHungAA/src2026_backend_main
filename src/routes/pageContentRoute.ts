import express, { Router } from 'express'
import {
    createPageContentVersion,
    getPageContent,
    getPageContentVersion,
    getPageContentVersionDiff,
    getPageContentVersions,
    loadDefaultPageContent,
    restorePageContentVersionAsDraft,
    updatePageContent,
} from '../controller/pageContent/pageContent.js';

const router: Router = express.Router();

router.get('/', getPageContent);
router.put('/', updatePageContent);
router.post('/default', loadDefaultPageContent);
router.get('/versions', getPageContentVersions);
router.post('/versions', createPageContentVersion);
router.get('/versions/:id', getPageContentVersion);
router.get('/versions/:id/diff', getPageContentVersionDiff);
router.post('/versions/:id/restore-draft', restorePageContentVersionAsDraft);

export default router;
