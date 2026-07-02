import express, { Router } from 'express';
import {
    getAuditLog,
    getAuditLogs,
} from '../../controller/cms/auditLogController.js';
import { authMiddleware, requirePermission } from '../../middleware/authMiddleware.js';

const router: Router = express.Router();

router.use(authMiddleware);
router.get('/', requirePermission('audit.read'), getAuditLogs);
router.get('/:id', requirePermission('audit.read'), getAuditLog);

export default router;
