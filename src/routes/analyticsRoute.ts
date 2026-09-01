import { Router } from 'express';
import {
    exportAnalyticsCsv,
    getAnalyticsSummary,
} from '../controller/analytics/analyticsController.js';
import { authMiddleware, requirePermission } from '../middleware/authMiddleware.js';
import { privateNoStore } from '../middleware/httpPolicy.js';

const router: Router = Router();

router.use(authMiddleware, privateNoStore);
router.get('/summary', requirePermission('dashboard.read'), getAnalyticsSummary);
router.get('/export.csv', requirePermission('dashboard.read'), exportAnalyticsCsv);

export default router;
