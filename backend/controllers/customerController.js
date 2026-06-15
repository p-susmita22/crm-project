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
  const { name, phone, email, companyName, address, fullAddress, notes, assignedTo, job, otherReason, status, followUpDate, pincode, state, onboarding } = req.body;

  // Make sure the existing IDs are fully re-indexed (no gaps, etc.)
  await reindexCustomers();

  // The next ID includes a timestamp to prevent duplicate key collisions
  const count = await Customer.countDocuments();
  const finalId = `cus-M${Date.now().toString().slice(-6)}-${String(count + 1).padStart(3, '0')}`;

  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Kolkata', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  const today = formatter.format(new Date());

  const customerData = {
    customerId: finalId,
    name,
    phone,
    email,
    companyName,
    address,
    fullAddress,
    notes,
    assignedTo: assignedTo || req.user._id,
    job,
    otherReason,
    status,
    pincode,
    state,
    onboarding,
    taskDate: today,
    sourceFile: 'Manual Entry'
  };

  if (followUpDate) {
    customerData.followUpDate = followUpDate;
  }

  const customer = new Customer(customerData);

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
  const fields = ['name', 'phone', 'email', 'companyName', 'address', 'fullAddress', 'notes', 'status', 'followUpDate', 'job', 'otherReason', 'pincode', 'state', 'onboarding'];
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

  let dateFilter = {};
  if (date && req.user.role === 'Admin') {
    dateFilter = { taskDate: date };
  }

  if (req.user.role === 'Admin') {
    const filter = employeeId ? { assignedTo: employeeId, ...dateFilter } : { ...dateFilter };
    customers = await Customer.find(filter).populate('assignedTo', 'name email').sort({ createdAt: 1 });
  } else {
    // Employees only export their own assigned customers that they have worked on (not pending)
    // Filter specifically by the date they were updated (in IST) to match "what I did today"
    const targetDateStr = date 
      ? new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) 
      : new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      
    const allAssigned = await Customer.find({ 
      assignedTo: req.user._id, 
      status: { $ne: 'Pending' }
    }).populate('assignedTo', 'name email').sort({ updatedAt: -1 });

    customers = allAssigned.filter(c => {
      // Check if updatedAt matches target date
      const updatedDateStr = new Date(c.updatedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      return updatedDateStr === targetDateStr;
    });
  }

  const rows = customers.map(c => ({
    'Customer ID':   c.customerId || '',
    'Name':          c.name || '',
    'Contact No':    c.phone || '',
    'Mail ID':       c.email || '',
    'Company Name':  c.companyName || '',
    'Onboarding As': c.onboarding || '',
    'Remarks':       c.notes || ''
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

  const formatterExport = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Kolkata', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  const dateStr = formatterExport.format(new Date());
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
