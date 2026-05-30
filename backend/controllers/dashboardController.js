import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'Admin';
  const query = isAdmin ? {} : { assignedTo: req.user._id };

  const totalCustomers = await Customer.countDocuments(query);
  const totalLeads = await Lead.countDocuments(query);
  const totalEmployees = await User.countDocuments({ role: 'Employee' });
  
  const convertedLeads = await Lead.countDocuments({ ...query, status: 'Converted' });
  const rejectedCustomers = await Customer.countDocuments({ ...query, status: 'Reject' });

  // Example Charts Data: Customers grouped by status
  const customerStatusData = await Customer.aggregate([
    { $match: query },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Lead status data
  const leadStatusData = await Lead.aggregate([
    { $match: query },
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
          from: 'leads',
          localField: '_id',
          foreignField: 'assignedTo',
          as: 'leads'
        }
      },
      {
        $project: {
          name: 1,
          customerCount: { $size: '$customers' },
          leadCount: { $size: '$leads' }
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
