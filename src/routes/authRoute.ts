import express, { Router } from 'express'
import { confirmEmail, forgotPassword, login, logout, me, signup } from '../controller/auth/auth.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { privateNoStore } from '../middleware/httpPolicy.js';

const router: Router = express.Router();

const authIdentity = (req: express.Request) =>
    `${req.ip}:${String(req.body?.email ?? '').trim().toLowerCase()}`;

router.use(privateNoStore);
router.post('/signup', rateLimit({ scope: 'auth.signup', limit: 5, windowMs: 15 * 60 * 1000, identity: authIdentity }), signup);
router.get('/confirm-email', confirmEmail);
router.post('/login', rateLimit({ scope: 'auth.login', limit: 10, windowMs: 15 * 60 * 1000, identity: authIdentity }), login);
router.get('/me', optionalAuthMiddleware, me);
router.post('/logout', authMiddleware, logout);
router.post('/forgot-password', forgotPassword);

export default router;
