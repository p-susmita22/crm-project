import express from 'express';
import {
  getTrashItems,
  restoreTrashItems,
  permanentlyDeleteTrashItems,
  emptyTrash,
  getTrashChat,
} from '../controllers/trashController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, admin); // All trash routes are Admin-only

router.route('/')
  .get(getTrashItems);

router.post('/restore', restoreTrashItems);
router.post('/permanent-delete', permanentlyDeleteTrashItems);
router.delete('/empty', emptyTrash);
router.get('/chat/:phone', getTrashChat);

export default router;
