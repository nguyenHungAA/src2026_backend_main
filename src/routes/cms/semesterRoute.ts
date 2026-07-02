import express, { Router } from 'express';
import {
    activateSemester,
    archiveSemester,
    createSemester,
    duplicateSemester,
    getAdminSemester,
    getAdminSemesters,
    updateSemester,
} from '../../controller/cms/semesterController.js';
import { authMiddleware, requirePermission } from '../../middleware/authMiddleware.js';

const router: Router = express.Router();

router.use(authMiddleware);
router.get('/', requirePermission('semesters.manage'), getAdminSemesters);
router.post('/', requirePermission('semesters.manage'), createSemester);
router.get('/:id', requirePermission('semesters.manage'), getAdminSemester);
router.patch('/:id', requirePermission('semesters.manage'), updateSemester);
router.post('/:id/activate', requirePermission('semesters.manage'), activateSemester);
router.post('/:id/archive', requirePermission('semesters.manage'), archiveSemester);
router.post('/:id/duplicate', requirePermission('semesters.manage'), duplicateSemester);

export default router;
