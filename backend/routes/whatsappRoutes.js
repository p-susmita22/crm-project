import express from 'express';
import { verifyWebhook, receiveMessage, getChats, getChatHistory, sendManualMessage } from '../controllers/whatsappController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/webhook')
  .get(verifyWebhook)
  .post(receiveMessage);

// WhatsApp Chat API
router.route('/chats').get(protect, admin, getChats);
router.route('/chats/:phone').get(protect, admin, getChatHistory);
router.route('/chats/:phone/send').post(protect, admin, sendManualMessage);

export default router;
