import express from 'express';
import { authUser, registerUser, logoutUser, getUserProfile, registerAdmin, forgotPassword, verifyOtp, resetPassword } from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', protect, admin, upload.single('customerFile'), registerUser);
router.post('/admin-signup', registerAdmin);
router.post('/logout', logoutUser);
router.get('/profile', protect, getUserProfile);

// Forgot password flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

export default router;
