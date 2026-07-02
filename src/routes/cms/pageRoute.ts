import express, { Router } from 'express';
import {
    archivePage,
    createDraftPage,
    getAdminPage,
    getAdminPages,
    getPagePreview,
    publishPage,
    submitPageForReview,
    updateDraftPage,
} from '../../controller/cms/pageController.js';
import { authMiddleware, requirePermission } from '../../middleware/authMiddleware.js';

const router: Router = express.Router();

router.use(authMiddleware);
router.get('/', requirePermission('content.read'), getAdminPages);
router.post('/', requirePermission('content.update'), createDraftPage);
router.get('/:id', requirePermission('content.read'), getAdminPage);
router.patch('/:id', requirePermission('content.update'), updateDraftPage);
router.post('/:id/submit-review', requirePermission('content.update'), submitPageForReview);
router.post('/:id/publish', requirePermission('content.publish'), publishPage);
router.post('/:id/archive', requirePermission('content.publish'), archivePage);
router.get('/:id/preview', requirePermission('content.read'), getPagePreview);

export default router;
