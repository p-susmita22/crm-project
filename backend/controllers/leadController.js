import asyncHandler from 'express-async-handler';
import Lead from '../models/Lead.js';

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
const getLeads = asyncHandler(async (req, res) => {
  let leads;
  if (req.user.role === 'Admin') {
    leads = await Lead.find({}).populate('assignedTo', 'name email');
  } else {
    leads = await Lead.find({ assignedTo: req.user._id }).populate('assignedTo', 'name email');
  }
  res.json(leads);
});

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
const getLeadById = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name email');

  if (lead) {
    if (req.user.role !== 'Admin' && lead.assignedTo?._id.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to view this lead');
    }
    res.json(lead);
  } else {
    res.status(404);
    throw new Error('Lead not found');
  }
});

// @desc    Create a lead
// @route   POST /api/leads
// @access  Private
const createLead = asyncHandler(async (req, res) => {
  const { name, email, phone, companyName, job, source, status, notes, assignedTo } = req.body;

  const lead = new Lead({
    name,
    email,
    phone,
    companyName,
    job,
    source,
    status,
    notes,
    assignedTo: assignedTo || req.user._id,
  });

  const createdLead = await lead.save();
  res.status(201).json(createdLead);
});

// @desc    Update a lead
// @route   PUT /api/leads/:id
// @access  Private
const updateLead = asyncHandler(async (req, res) => {
  const { name, email, phone, companyName, job, source, status, notes, assignedTo } = req.body;

  const lead = await Lead.findById(req.params.id);

  if (lead) {
    if (req.user.role !== 'Admin' && lead.assignedTo?._id.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to update this lead');
    }

    lead.name = name || lead.name;
    lead.email = email !== undefined ? email : lead.email;
    lead.phone = phone || lead.phone;
    lead.companyName = companyName !== undefined ? companyName : lead.companyName;
    lead.job = job !== undefined ? job : lead.job;
    lead.source = source || lead.source;
    lead.status = status || lead.status;
    lead.notes = notes !== undefined ? notes : lead.notes;
    
    if (req.user.role === 'Admin' && assignedTo) {
      lead.assignedTo = assignedTo;
    }

    const updatedLead = await lead.save();
    res.json(updatedLead);
  } else {
    res.status(404);
    throw new Error('Lead not found');
  }
});

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
// @access  Private/Admin
const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (lead) {
    await lead.deleteOne();
    res.json({ message: 'Lead removed' });
  } else {
    res.status(404);
    throw new Error('Lead not found');
  }
});

export { getLeads, getLeadById, createLead, updateLead, deleteLead };
