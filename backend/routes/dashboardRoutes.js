import express from 'express';
import { getDashboardStats, getNotifications } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getDashboardStats);
router.route('/notifications').get(protect, getNotifications);

export default router;
