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

// @desc    Get current user profile (with sessions)
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
}));

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    
    if (req.body.password) {
      user.password = req.body.password;
      user.plainPassword = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
}));

// @desc    Update password
// @route   PUT /api/users/profile/password
// @access  Private
router.put('/profile/password', protect, asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (user) {
    user.password = newPassword;
    user.plainPassword = newPassword; // Store plain for admin reference if needed
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
}));

// @desc    Delete a session
// @route   DELETE /api/users/session/:sessionId
// @access  Private
router.delete('/session/:sessionId', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.sessions = user.sessions.filter(s => s._id.toString() !== req.params.sessionId);
    await user.save({ validateBeforeSave: false });
    res.json({ message: 'Session removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
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

  const { name, email, phone, password, assignedCallsCount, isActive } = req.body;

  user.name = name || user.name;
  user.email = email || user.email;
  user.phone = phone || user.phone;
  if (assignedCallsCount !== undefined) {
    user.assignedCallsCount = Number(assignedCallsCount) || 0;
  }
  if (isActive !== undefined) {
    user.isActive = isActive === 'true' || isActive === true;
  }

  if (password && password.trim() !== '') {
    user.password = password;
    user.plainPassword = password;
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
    assignedCallsCount: updatedUser.assignedCallsCount,
    isActive: updatedUser.isActive
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
  const mongoose = (await import('mongoose')).default;
  const empObjectId = mongoose.Types.ObjectId.createFromHexString(req.params.id);

  // Delete all tasks for this employee on this date
  const result = await Customer.deleteMany({ assignedTo: empObjectId, taskDate: req.params.date });

  // Recalculate assignedCallsCount from actual remaining customer records
  const remainingCount = await Customer.countDocuments({ assignedTo: empObjectId });
  await User.findByIdAndUpdate(req.params.id, { assignedCallsCount: remainingCount });

  res.json({ message: `Deleted ${result.deletedCount} tasks for ${req.params.date}`, assignedCallsCount: remainingCount });
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

  const Customer = (await import('../models/Customer.js')).default;
  const ArchivedEmployee = (await import('../models/ArchivedEmployee.js')).default;

  // Fetch all customers assigned to this employee
  const customers = await Customer.find({ assignedTo: user._id });

  // Calculate stats
  let convertedLeads = 0;
  let rejectedCustomers = 0;
  let pendingCustomers = 0;
  let otherCustomers = 0;

  const archivedCustomers = customers.map(c => {
    if (c.status === 'Agree') convertedLeads++;
    else if (c.status === 'Reject') rejectedCustomers++;
    else if (c.status === 'Pending') pendingCustomers++;
    else if (c.status === 'Others') otherCustomers++;

    return {
      customerId: c.customerId,
      name: c.name,
      phone: c.phone,
      email: c.email,
      companyName: c.companyName,
      status: c.status,
      onboarding: c.onboarding,
      taskDate: c.taskDate,
      sourceFile: c.sourceFile
    };
  });

  // Create archived employee record
  await ArchivedEmployee.create({
    name: user.name,
    email: user.email,
    phone: user.phone,
    employeeId: user.employeeId,
    role: user.role,
    stats: {
      totalCustomers: customers.length,
      convertedLeads,
      rejectedCustomers,
      pendingCustomers,
      otherCustomers,
    },
    customers: archivedCustomers
  });

  // Delete all customers assigned to this employee
  await Customer.deleteMany({ assignedTo: user._id });

  await user.deleteOne();
  // Collapse the sequence gap immediately
  await reindexEmployees();
  res.json({ message: 'Employee deleted and archived successfully' });
}));

// @desc    Get employee history (archived employees)
// @route   GET /api/users/history/archived
// @access  Private/Admin
router.get('/history/archived', protect, admin, asyncHandler(async (req, res) => {
  const ArchivedEmployee = (await import('../models/ArchivedEmployee.js')).default;
  const archived = await ArchivedEmployee.find({}).sort({ deletedAt: -1 });
  res.json(archived);
}));

// @desc    Delete archived employee permanently
// @route   DELETE /api/users/history/archived/:id
// @access  Private/Admin
router.delete('/history/archived/:id', protect, admin, asyncHandler(async (req, res) => {
  const ArchivedEmployee = (await import('../models/ArchivedEmployee.js')).default;
  const archived = await ArchivedEmployee.findById(req.params.id);
  
  if (archived) {
    await archived.deleteOne();
    res.json({ message: 'Archived employee permanently deleted' });
  } else {
    res.status(404);
    throw new Error('Archived employee not found');
  }
}));

export default router;
