import express from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import WorkSubmission from '../models/WorkSubmission.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Use diskStorage to actually save the file so Admin can download it
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `work-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/', protect, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please select a file to upload (Excel, PDF, etc.)');
  }

  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const existing = await WorkSubmission.findOne({ employee: req.user._id, submissionDate: date });
  
  if (existing) {
    // If they already submitted today, just update the file with the newest one!
    existing.fileName = req.file.originalname;
    existing.fileUrl = `/uploads/${req.file.filename}`;
    existing.isRead = false; // Mark as unread so admin notices the update
    await existing.save();
    return res.status(200).json(existing);
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
