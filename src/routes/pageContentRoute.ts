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
import { publicCache } from '../middleware/httpPolicy.js';
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js';

const router: Router = express.Router();

router.get('/', publicCache(), getPageContent);
router.put('/', authMiddleware, requirePermission('content.update'), updatePageContent);
router.post('/default', authMiddleware, requirePermission('content.update'), loadDefaultPageContent);
router.get('/versions', authMiddleware, requirePermission('content.read'), getPageContentVersions);
router.post('/versions', authMiddleware, requirePermission('content.update'), createPageContentVersion);
router.get('/versions/:id', authMiddleware, requirePermission('content.read'), getPageContentVersion);
router.get('/versions/:id/diff', authMiddleware, requirePermission('content.read'), getPageContentVersionDiff);
router.post('/versions/:id/restore-draft', authMiddleware, requirePermission('content.update'), restorePageContentVersionAsDraft);

export default router;
