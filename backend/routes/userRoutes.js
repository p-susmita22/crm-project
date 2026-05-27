import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import upload from '../middleware/uploadMiddleware.js';
import { importCustomersFromFile } from '../utils/customerImporter.js';
import { reindexEmployees } from '../utils/employeeReindexer.js';

const router = express.Router();

// @desc    Get all users (employees)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, admin, asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
}));

// @desc    Employee starts session (goes online)
// @route   POST /api/users/session/start
// @access  Private/Employee
router.post('/session/start', protect, asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    isOnline: true,
    sessionStart: new Date(),
    lastSeenAt: new Date(),
  });
  res.json({ message: 'Session started' });
}));

// @desc    Employee heartbeat (still online, update working seconds)
// @route   POST /api/users/session/heartbeat
// @access  Private/Employee
router.post('/session/heartbeat', protect, asyncHandler(async (req, res) => {
  const { elapsedSeconds } = req.body;
  await User.findByIdAndUpdate(req.user._id, {
    lastSeenAt: new Date(),
    $inc: { todayWorkingSeconds: elapsedSeconds || 30 },
  });
  res.json({ message: 'Heartbeat received' });
}));

// @desc    Employee ends session (goes offline)
// @route   POST /api/users/session/end
// @access  Private/Employee
router.post('/session/end', protect, asyncHandler(async (req, res) => {
  const { elapsedSeconds } = req.body;
  await User.findByIdAndUpdate(req.user._id, {
    isOnline: false,
    lastSeenAt: new Date(),
    $inc: { todayWorkingSeconds: elapsedSeconds || 0 },
  });
  res.json({ message: 'Session ended' });
}));

// @desc    Get all employee statuses (admin view)
// @route   GET /api/users/status
// @access  Private/Admin
router.get('/status', protect, admin, asyncHandler(async (req, res) => {
  const { date } = req.query;
  const employees = await User.find({ role: 'Employee' }).select('-password').lean();

  if (date) {
    const today = new Date().toISOString().split('T')[0];
    if (date !== today) {
      // Fetch reports for that past date
      const reports = await Report.find({ reportDate: date });
      const reportMap = {};
      reports.forEach((r) => {
        reportMap[r.employee.toString()] = r;
      });

      // Override current live data with historical data
      employees.forEach((emp) => {
        const report = reportMap[emp._id.toString()];
        emp.isOnline = false; // Always offline in the past
        emp.todayWorkingSeconds = report ? report.sessionTimeSeconds : 0;
        emp.assignedCallsCount = report ? report.totalCallsAssigned : emp.assignedCallsCount;
      });
    } else {
      // Live data for today: check heartbeat timeout
      const now = new Date();
      employees.forEach((emp) => {
        if (emp.isOnline && emp.lastSeenAt) {
          const diffMs = now - new Date(emp.lastSeenAt);
          if (diffMs > 2 * 60 * 1000) { // 2 minutes timeout
            emp.isOnline = false;
          }
        }
      });
    }
  } else {
    // Live data without date parameter: check heartbeat timeout
    const now = new Date();
    employees.forEach((emp) => {
      if (emp.isOnline && emp.lastSeenAt) {
        const diffMs = now - new Date(emp.lastSeenAt);
        if (diffMs > 2 * 60 * 1000) { // 2 minutes timeout
          emp.isOnline = false;
        }
      }
    });
  }

  res.json(employees);
}));

// @desc    Update employee
// @route   PUT /api/users/:id
// @access  Private/Admin
router.put('/:id', protect, admin, upload.single('customerFile'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, email, phone, password, assignedCallsCount } = req.body;

  user.name = name || user.name;
  user.email = email || user.email;
  user.phone = phone || user.phone;
  if (assignedCallsCount !== undefined) {
    user.assignedCallsCount = Number(assignedCallsCount) || 0;
  }

  if (password && password.trim() !== '') {
    user.password = password;
  }

  if (req.file) {
    user.customerFile = {
      originalName: req.file.originalname,
      uploadedAt: new Date()
    };
  }

  let updatedUser = await user.save();

  if (req.file) {
    try {
      await importCustomersFromFile(req.file.buffer, updatedUser._id);
      updatedUser = await User.findById(updatedUser._id);
    } catch (err) {
      console.error('Failed to import customers on update:', err);
    }
  }

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    phone: updatedUser.phone,
    employeeId: updatedUser.employeeId,
    customerFile: updatedUser.customerFile,
    assignedCallsCount: updatedUser.assignedCallsCount
  });
}));

// @desc    Upload daily task file to an employee (admin only)
// @route   POST /api/users/:id/upload-tasks
// @access  Private/Admin
router.post('/:id/upload-tasks', protect, admin, upload.single('customerFile'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an Excel or CSV file');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('Employee not found');
  }

  const taskDate = req.body.taskDate || new Date().toISOString().split('T')[0];

  // Store file metadata (no disk path — using memory storage)
  user.customerFile = {
    originalName: req.file.originalname,
    uploadedAt: new Date()
  };



  let updatedUser = await user.save();

  try {
    await importCustomersFromFile(req.file.buffer, updatedUser._id, taskDate, req.file.originalname);
    updatedUser = await User.findById(updatedUser._id);
  } catch (err) {
    console.error('Failed to import customers from task upload:', err);
  }

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    customerFile: updatedUser.customerFile,
    assignedCallsCount: updatedUser.assignedCallsCount,
    taskDate,
    message: `Daily tasks uploaded for ${updatedUser.name} on ${taskDate}`
  });
}));

// @desc    Get date-wise task history for an employee
// @route   GET /api/users/:id/task-history
// @access  Private/Admin
router.get('/:id/task-history', protect, admin, asyncHandler(async (req, res) => {
  const Customer = (await import('../models/Customer.js')).default;

  // Aggregate customers by taskDate + sourceFile for this employee (one row per file per date)
  const history = await Customer.aggregate([
    { $match: { assignedTo: (await import('mongoose')).default.Types.ObjectId.createFromHexString(req.params.id) } },
    {
      $group: {
        _id:     { date: '$taskDate', file: { $ifNull: ['$sourceFile', ''] } },
        total:   { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] },  1, 0] } },
        agree:   { $sum: { $cond: [{ $eq: ['$status', 'Agree'] },    1, 0] } },
        reject:  { $sum: { $cond: [{ $eq: ['$status', 'Reject'] },   1, 0] } },
        others:  { $sum: { $cond: [{ $eq: ['$status', 'Others'] },   1, 0] } },
      },
    },
    { $sort: { '_id.date': -1, '_id.file': 1 } }, // newest date first, then by file name
  ]);

  res.json(history.map(h => ({
    date:      h._id.date,
    file:      h._id.file || '',
    total:     h.total,
    pending:   h.pending,
    agree:     h.agree,
    reject:    h.reject,
    others:    h.others,
    completed: h.agree + h.reject + h.others,
  })));
}));

// @desc    Delete tasks for a specific date
// @route   DELETE /api/users/:id/tasks/:date
// @access  Private/Admin
router.delete('/:id/tasks/:date', protect, admin, asyncHandler(async (req, res) => {
  const Customer = (await import('../models/Customer.js')).default;
  const result = await Customer.deleteMany({
    assignedTo: (await import('mongoose')).default.Types.ObjectId.createFromHexString(req.params.id),
    taskDate: req.params.date
  });
  res.json({ message: `Deleted ${result.deletedCount} tasks for ${req.params.date}` });
}));

// @desc    Delete employee
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  if (user.role === 'Admin') { res.status(400); throw new Error('Cannot delete admin'); }
  
  // Clean up customer file from disk if exists
  if (user.customerFile && user.customerFile.filePath) {
    if (fs.existsSync(user.customerFile.filePath)) {
      try {
        fs.unlinkSync(user.customerFile.filePath);
      } catch (err) {
        console.error('Error deleting customer file:', err);
      }
    }
  }

  await user.deleteOne();
  // Collapse the sequence gap immediately
  await reindexEmployees();
  res.json({ message: 'Employee deleted' });
}));

export default router;
