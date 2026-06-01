import Router from 'koa-router';
import authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = new Router({ prefix: '/auth' });

// Rutas públicas
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtpCode);
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas
router.get('/verify', authenticateToken, authController.verifyToken);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/refresh', authenticateToken, authController.refreshToken);

export default router;