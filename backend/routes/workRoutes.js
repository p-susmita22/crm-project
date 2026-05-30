import express from 'express';
import asyncHandler from 'express-async-handler';
import WorkSubmission from '../models/WorkSubmission.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/', protect, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please select a file to upload (Excel, PDF, etc.)');
  }

  const date = new Date().toISOString().slice(0, 10);
  const existing = await WorkSubmission.findOne({ employee: req.user._id, submissionDate: date });
  
  if (existing) {
    res.status(400);
    throw new Error('Work already sent for today!');
  }
  
  const submission = await WorkSubmission.create({
    employee: req.user._id,
    employeeName: req.user.name,
    submissionDate: date,
    fileName: req.file.originalname,
    fileUrl: `/uploads/${req.file.filename}`
  });
  
  res.status(201).json(submission);
}));

router.get('/', protect, admin, asyncHandler(async (req, res) => {
  const submissions = await WorkSubmission.find({}).sort({ createdAt: -1 });
  res.json(submissions);
}));

router.put('/:id/read', protect, admin, asyncHandler(async (req, res) => {
  const sub = await WorkSubmission.findById(req.params.id);
  if (sub) {
    sub.isRead = true;
    await sub.save();
    res.json(sub);
  } else {
    res.status(404);
    throw new Error('Not found');
  }
}));

export default router;
