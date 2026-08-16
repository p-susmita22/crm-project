import express from 'express';
import multer from 'multer';
import { verifyWebhook, receiveMessage, getChats, getChatHistory, sendManualMessage, uploadMedia, deleteChats } from '../controllers/whatsappController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB Meta limit
});

const router = express.Router();

router.route('/webhook')
  .get(verifyWebhook)
  .post(receiveMessage);

router.route('/chats')
  .get(protect, admin, getChats)
  .delete(protect, admin, deleteChats);
router.route('/chats/:phone').get(protect, admin, getChatHistory);
router.route('/chats/:phone/send').post(protect, admin, sendManualMessage);
router.post('/upload-media', protect, admin, mediaUpload.single('file'), uploadMedia);


export default router;
