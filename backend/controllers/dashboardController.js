import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import WorkSubmission from '../models/WorkSubmission.js';

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'Admin';
  const query = isAdmin ? {} : { assignedTo: req.user._id };

  const totalCustomers = await Customer.countDocuments(query);
  const totalLeads = await Customer.countDocuments({ ...query, status: { $in: ['Agree', 'Interested'] } });
  const totalEmployees = await User.countDocuments({ role: 'Employee' });
  
  const convertedLeads = await Customer.countDocuments({ ...query, status: { $in: ['Agree', 'Interested'] } });
  const rejectedCustomers = await Customer.countDocuments({ ...query, status: 'Reject' });

  // Example Charts Data: Customers grouped by status
  const customerStatusData = await Customer.aggregate([
    { $match: query },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Lead status data (using Customer Agree/Interested)
  const leadStatusData = await Customer.aggregate([
    { $match: { ...query, status: { $in: ['Agree', 'Interested'] } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Recent tasks
  const recentTasks = await Task.find(query)
    .sort({ dueDate: 1 })
    .limit(5)
    .populate('relatedCustomer', 'name')
    .populate('relatedLead', 'name');

  // Employee Performance (Admin only)
  let employeePerformance = [];
  if (isAdmin) {
    employeePerformance = await User.aggregate([
      { $match: { role: 'Employee' } },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: 'assignedTo',
          as: 'customers'
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: 'assignedTo',
          as: 'allCustomers'
        }
      },
      {
        $project: {
          name: 1,
          customerCount: { $size: '$allCustomers' },
          leadCount: {
            $size: {
              $filter: {
                input: '$allCustomers',
                as: 'c',
                cond: { $in: ['$$c.status', ['Agree', 'Interested']] }
              }
            }
          }
        }
      }
    ]);
  }

  res.json({
    totalCustomers,
    totalLeads,
    totalEmployees,
    convertedLeads,
    rejectedCustomers,
    customerStatusData,
    leadStatusData,
    recentTasks,
    employeePerformance
  });
});

export { getDashboardStats };

// @desc    Get notification counts (unread reports, unread work submissions)
// @route   GET /api/dashboard/notifications
// @access  Private/Admin
const getNotifications = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.json({ unreadReports: 0, unreadWork: 0 });
  }

  const unreadReports = await Report.countDocuments({ isRead: false });
  const unreadWork = await WorkSubmission.countDocuments({ isRead: false });

  res.json({
    unreadReports,
    unreadWork
  });
});

export { getNotifications };
