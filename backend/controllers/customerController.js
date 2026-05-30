import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { reindexCustomers } from '../utils/reindexer.js';
import xlsx from 'xlsx';
import axios from 'axios';
import https from 'https';

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = asyncHandler(async (req, res) => {
  let customers;
  if (req.user.role === 'Admin') {
    customers = await Customer.find({}).populate('assignedTo', 'name email');
  } else {
    // Employees see only assigned customers
    customers = await Customer.find({ assignedTo: req.user._id }).populate('assignedTo', 'name email');
  }
  res.json(customers);
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id).populate('assignedTo', 'name email');

  if (customer) {
    // Check if employee is authorized to view
    if (req.user.role !== 'Admin' && customer.assignedTo?._id.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to view this customer');
    }
    res.json(customer);
  } else {
    res.status(404);
    throw new Error('Customer not found');
  }
});

// @desc    Create a customer
// @route   POST /api/customers
// @access  Private
const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, companyName, address, notes, assignedTo, job, otherReason, status, followUpDate, pincode, state } = req.body;

  // Make sure the existing IDs are fully re-indexed (no gaps, etc.)
  await reindexCustomers();

  // The next ID is count + 1
  const count = await Customer.countDocuments();
  const finalId = `cus-${String(count + 1).padStart(3, '0')}`;

  const today = new Date().toISOString().split('T')[0];

  const customer = new Customer({
    customerId: finalId,
    name,
    phone,
    email,
    companyName,
    address,
    notes,
    assignedTo: assignedTo || req.user._id,
    job,
    otherReason,
    status,
    followUpDate,
    pincode,
    state,
    taskDate: today,
    sourceFile: 'Manual Entry'
  });

  const createdCustomer = await customer.save();

  // Recalculate assignedCallsCount for the assigned employee
  const assignedEmpId = assignedTo || req.user._id;
  const totalCount = await Customer.countDocuments({ assignedTo: assignedEmpId });
  await User.findByIdAndUpdate(assignedEmpId, { assignedCallsCount: totalCount });

  res.status(201).json(createdCustomer);
});

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  if (req.user.role !== 'Admin' && customer.assignedTo?._id.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this customer');
  }

  // Explicitly update only fields that were sent in the request body
  const fields = ['name', 'phone', 'email', 'companyName', 'address', 'notes', 'status', 'followUpDate', 'job', 'otherReason', 'pincode', 'state'];
  fields.forEach(field => {
    if (req.body.hasOwnProperty(field)) {
      customer[field] = req.body[field];
    }
  });

  if (req.body.newCallLog) {
    customer.callHistory.push(req.body.newCallLog);
  }

  // Only admin can reassign
  if (req.user.role === 'Admin' && req.body.assignedTo) {
    customer.assignedTo = req.body.assignedTo;
  }

  const updatedCustomer = await customer.save();
  res.json(updatedCustomer);
});

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private/Admin
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (customer) {
    await customer.deleteOne();
    // Collapse the sequence gap immediately after delete
    await reindexCustomers();
    res.json({ message: 'Customer removed' });
  } else {
    res.status(404);
    throw new Error('Customer not found');
  }
});


// @desc    Export customers to Excel
// @route   GET /api/customers/export/excel
// @access  Private
const exportCustomersExcel = asyncHandler(async (req, res) => {
  let customers;
  const { employeeId, date } = req.query;

  // Filter by taskDate string (YYYY-MM-DD) — exact match, not range
  let dateFilter = {};
  if (date) {
    dateFilter = { taskDate: date };
  }

  if (req.user.role === 'Admin') {
    const filter = employeeId ? { assignedTo: employeeId, ...dateFilter } : { ...dateFilter };
    customers = await Customer.find(filter).populate('assignedTo', 'name email').sort({ createdAt: 1 });
  } else {
    // Employees only export their own assigned customers
    customers = await Customer.find({ assignedTo: req.user._id, ...dateFilter }).populate('assignedTo', 'name email').sort({ createdAt: 1 });
  }

  const rows = customers.map(c => ({
    'Task Date':     c.taskDate || new Date(c.createdAt).toISOString().split('T')[0],
    'Customer ID':   c.customerId || '',
    'Customer Name': c.name || '',
    'Contact Number': c.phone || '',
    'Email ID':      c.email || '',
    'Company':       c.companyName || '',
    'Job Title':     c.job || '',
    'Onboarding':    c.onboarding || '',
    'District':      c.address || '',
    'Pin Code':      c.pincode || '',
    'State':         c.state || '',
    'Status':        c.status === 'Agree' ? 'Interested' :
                     c.status === 'Reject' ? 'Rejected' :
                     c.status === 'Others' ? 'Others' :
                     (c.status || 'Pending'),
    'Others Reason': c.otherReason || '',
    'Follow-up Date': c.followUpDate ? new Date(c.followUpDate).toLocaleDateString('en-IN') : '',
    'Remarks / Notes': c.notes || '',
    'Assigned Employee': c.assignedTo?.name || '',
  }));

  const worksheet = xlsx.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 22 },
    { wch: 18 }, { wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 12 },
    { wch: 20 }, { wch: 16 }, { wch: 30 }, { wch: 20 },
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Customer Tasks');

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Customer_Tasks_${dateStr}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// @desc    Get pincode data from external API (bypass SSL)
// @route   GET /api/customers/pincode/:pincode
// @access  Private
const getPincodeInfo = asyncHandler(async (req, res) => {
  const { pincode } = req.params;
  
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, { httpsAgent: agent });
    res.json(response.data);
  } catch (error) {
    res.status(500);
    throw new Error('Failed to fetch pincode data');
  }
});

export {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  exportCustomersExcel,
  getPincodeInfo,
};
