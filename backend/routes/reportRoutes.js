import express from 'express';
import asyncHandler from 'express-async-handler';
import Report from '../models/Report.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Employee submits daily report
// @route   POST /api/reports
// @access  Private/Employee
router.post('/', protect, asyncHandler(async (req, res) => {
  const { reportDate, totalCallsAssigned, callsDone, leadsGenerated, positiveResponses, negativeResponses, additionalNotes, sessionTimeSeconds } = req.body;

  // Check if report already submitted for today
  const existing = await Report.findOne({ employee: req.user._id, reportDate });
  if (existing) {
    res.status(400);
    throw new Error('You have already submitted a report for this date.');
  }

  const report = await Report.create({
    employee: req.user._id,
    employeeName: req.user.name,
    employeeId: req.user.employeeId || '',
    reportDate,
    totalCallsAssigned,
    callsDone,
    leadsGenerated,
    positiveResponses,
    negativeResponses,
    additionalNotes,
    sessionTimeSeconds: sessionTimeSeconds || 0,
  });

  res.status(201).json(report);
}));

// @desc    Employee views their own reports
// @route   GET /api/reports/mine
// @access  Private
router.get('/mine', protect, asyncHandler(async (req, res) => {
  const reports = await Report.find({ employee: req.user._id }).sort({ reportDate: -1 });
  res.json(reports);
}));

// @desc    Admin gets all reports
// @route   GET /api/reports
// @access  Private/Admin
router.get('/', protect, admin, asyncHandler(async (req, res) => {
  const reports = await Report.find({}).populate('employee', 'name email employeeId').sort({ reportDate: -1 });
  res.json(reports);
}));

// @desc    Admin deletes a report
// @route   DELETE /api/reports/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) { res.status(404); throw new Error('Report not found'); }
  await report.deleteOne();
  res.json({ message: 'Report deleted' });
}));

export default router;
