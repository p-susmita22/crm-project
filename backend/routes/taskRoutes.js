import express from 'express';
import {
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
} from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getTasks)
  .post(protect, createTask);

router.route('/:id')
  .delete(protect, deleteTask);

router.route('/:id/status')
  .put(protect, updateTaskStatus);

export default router;
