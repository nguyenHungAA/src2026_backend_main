import express, { Router } from 'express'
import { confirmEmail, forgotPassword, login, logout, me, signup } from '../controller/auth/auth.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router: Router = express.Router();

router.post('/signup', signup);
router.get('/confirm-email', confirmEmail);
router.post('/login', login);
router.get('/me', authMiddleware, me);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);

export default router;
