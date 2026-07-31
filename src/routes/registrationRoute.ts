import express, { Router } from 'express';
import submitRegistration from '../controller/registration/submitRegistration.js';
import verifyTurnstile from '../middleware/verifyTurnstile.js';

const router: Router = express.Router();

router.post('/', verifyTurnstile, submitRegistration);

export default router;
