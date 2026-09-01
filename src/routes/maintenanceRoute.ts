import { Router } from 'express';
import { runMaintenance } from '../controller/maintenanceController.js';
import { privateNoStore } from '../middleware/httpPolicy.js';

const router: Router = Router();

router.get('/internal/run', privateNoStore, runMaintenance);
router.post('/internal/run', privateNoStore, runMaintenance);

export default router;
