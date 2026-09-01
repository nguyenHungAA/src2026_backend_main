import express, { Router } from 'express';
import submitRegistration from '../controller/registration/submitRegistration.js';
import verifyTurnstile from '../middleware/verifyTurnstile.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { idempotency } from '../middleware/idempotency.js';

const router: Router = express.Router();

router.post(
    '/',
    rateLimit({ scope: 'registration.submit', limit: 3, windowMs: 10 * 60 * 1000 }),
    verifyTurnstile,
    idempotency('registration.submit'),
    submitRegistration,
);

export default router;
