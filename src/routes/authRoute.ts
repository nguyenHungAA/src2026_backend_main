import express, { Router } from 'express'
import { confirmEmail, forgotPassword, login, signup } from '../controller/auth.js';

const router: Router = express.Router();

router.post('/signup', signup);
router.get('/confirm-email', confirmEmail);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

export default router;
