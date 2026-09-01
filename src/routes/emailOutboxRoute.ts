import { Router } from 'express';
import { getEmailOutboxSummary, processEmailOutbox } from '../controller/emailOutboxController.js';
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js';
import { privateNoStore } from '../middleware/httpPolicy.js';

const router: Router = Router();

router.get('/internal/process', privateNoStore, processEmailOutbox);
router.post('/internal/process', privateNoStore, processEmailOutbox);
router.get('/admin/summary', privateNoStore, authMiddleware, requirePermission('audit.read'), getEmailOutboxSummary);

export default router;
