import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';
import WhatsAppMessage from '../models/WhatsAppMessage.js';
import User from '../models/User.js';

// @desc    Get all items in the Trash Bin (deleted WhatsApp chats & leads)
// @route   GET /api/trash
// @access  Private (Admin)
export const getTrashItems = asyncHandler(async (req, res) => {
  // 1. Fetch all soft-deleted customers/leads
  const deletedCustomers = await Customer.find({ isDeleted: true }).lean();

  // 2. Fetch soft-deleted WhatsApp messages grouped by customerPhone
  const deletedChats = await WhatsAppMessage.aggregate([
    { $match: { isDeleted: true } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$customerPhone',
        lastMessage: { $first: '$$ROOT' },
        messageCount: { $sum: 1 },
        deletedAt: { $max: '$deletedAt' },
      },
    },
  ]);

  // Unified map indexed by phone
  const itemsMap = new Map();

  // Add deleted chats first
  for (const chat of deletedChats) {
    const phone = chat._id;
    itemsMap.set(phone, {
      id: `chat-${phone}`,
      phone,
      name: 'WhatsApp User',
      type: 'WhatsApp Chat',
      onboarding: '',
      status: '',
      notes: '',
      messageCount: chat.messageCount || 0,
      lastMessage: chat.lastMessage || null,
      deletedAt: chat.deletedAt || chat.lastMessage?.timestamp || new Date(),
      customerRecordId: null,
      customerId: '',
      sourceFile: 'WhatsApp Chat',
    });
  }

  // Merge or add deleted customers
  for (const cust of deletedCustomers) {
    const phone = cust.phone;
    const isWaLead = cust.sourceFile === 'WhatsApp API';

    if (itemsMap.has(phone)) {
      const existing = itemsMap.get(phone);
      existing.name = cust.name || existing.name;
      existing.type = isWaLead ? 'WhatsApp Lead & Chat' : 'Lead & Chat';
      existing.onboarding = cust.onboarding || '';
      existing.status = cust.status || '';
      existing.notes = cust.notes || '';
      existing.customerRecordId = cust._id;
      existing.customerId = cust.customerId || '';
      existing.sourceFile = cust.sourceFile || 'WhatsApp API';
      if (cust.deletedAt && (!existing.deletedAt || new Date(cust.deletedAt) > new Date(existing.deletedAt))) {
        existing.deletedAt = cust.deletedAt;
      }
    } else {
      // Customer was soft deleted, check if it had any messages (even if not marked deleted yet)
      const count = await WhatsAppMessage.countDocuments({ customerPhone: phone });
      const lastMsg = count > 0 
        ? await WhatsAppMessage.findOne({ customerPhone: phone }).sort({ timestamp: -1 }).lean()
        : null;

      itemsMap.set(phone, {
        id: `cust-${cust._id}`,
        phone,
        name: cust.name || 'Unknown',
        type: isWaLead ? 'WhatsApp Lead' : 'Customer / Lead',
        onboarding: cust.onboarding || '',
        status: cust.status || '',
        notes: cust.notes || '',
        messageCount: count,
        lastMessage: lastMsg,
        deletedAt: cust.deletedAt || cust.updatedAt || new Date(),
        customerRecordId: cust._id,
        customerId: cust.customerId || '',
        sourceFile: cust.sourceFile || 'WhatsApp API',
      });
    }
  }

  // Fill in names for any chats that might match an active customer profile
  for (const [phone, item] of itemsMap.entries()) {
    if (item.name === 'WhatsApp User' || !item.name) {
      const activeCust = await Customer.findOne({ phone }).lean();
      if (activeCust && activeCust.name) {
        item.name = activeCust.name;
        if (!item.onboarding) item.onboarding = activeCust.onboarding;
        if (!item.status) item.status = activeCust.status;
        if (!item.customerId) item.customerId = activeCust.customerId;
        if (activeCust.sourceFile === 'WhatsApp API') {
          item.type = 'WhatsApp Lead & Chat';
        }
      }
    }
  }

  const trashList = Array.from(itemsMap.values()).sort(
    (a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)
  );

  res.json(trashList);
});

// @desc    Recover / Restore items from Trash Bin (with WhatsApp chat history)
// @route   POST /api/trash/restore
// @access  Private (Admin)
export const restoreTrashItems = asyncHandler(async (req, res) => {
  const { phoneNumbers } = req.body;

  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    res.status(400);
    throw new Error('Please provide at least one phone number to recover');
  }

  // 1. Restore WhatsApp messages for these phone numbers
  const msgResult = await WhatsAppMessage.updateMany(
    { customerPhone: { $in: phoneNumbers } },
    { $set: { isDeleted: false, deletedAt: null } }
  );

  // 2. Restore Customer / Lead records for these phone numbers
  const custResult = await Customer.updateMany(
    { phone: { $in: phoneNumbers } },
    { $set: { isDeleted: false, deletedAt: null, deletedSource: null } }
  );

  // 3. Recalculate call counts for assigned employees of restored customers
  const restoredCustomers = await Customer.find({ phone: { $in: phoneNumbers }, assignedTo: { $exists: true } });
  const employeeIds = [...new Set(restoredCustomers.map(c => c.assignedTo?.toString()).filter(Boolean))];
  for (const empId of employeeIds) {
    const totalCount = await Customer.countDocuments({ assignedTo: empId, isDeleted: { $ne: true } });
    await User.findByIdAndUpdate(empId, { assignedCallsCount: totalCount });
  }

  res.json({
    message: 'Numbers and WhatsApp chats successfully recovered!',
    restoredChats: msgResult.modifiedCount,
    restoredLeads: custResult.modifiedCount,
  });
});

// @desc    Permanently delete items from Trash Bin
// @route   POST /api/trash/permanent-delete
// @access  Private (Admin)
export const permanentlyDeleteTrashItems = asyncHandler(async (req, res) => {
  const { phoneNumbers } = req.body;

  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    res.status(400);
    throw new Error('Please provide at least one phone number to permanently delete');
  }

  // 1. Permanently remove WhatsApp messages
  await WhatsAppMessage.deleteMany({ customerPhone: { $in: phoneNumbers } });

  // 2. Permanently remove Customers / Leads
  await Customer.deleteMany({ phone: { $in: phoneNumbers } });

  res.json({ message: 'Items permanently deleted from database' });
});

// @desc    Empty the entire Trash Bin
// @route   DELETE /api/trash/empty
// @access  Private (Admin)
export const emptyTrash = asyncHandler(async (req, res) => {
  // Find all phones that have deleted messages
  const deletedMsgPhones = await WhatsAppMessage.distinct('customerPhone', { isDeleted: true });
  // Find all phones that have deleted customers
  const deletedCustPhones = await Customer.distinct('phone', { isDeleted: true });

  const allPhones = [...new Set([...deletedMsgPhones, ...deletedCustPhones])];

  if (allPhones.length > 0) {
    await WhatsAppMessage.deleteMany({ customerPhone: { $in: allPhones } });
    await Customer.deleteMany({ phone: { $in: allPhones } });
  }

  // Also clean up any lingering records with isDeleted: true
  await WhatsAppMessage.deleteMany({ isDeleted: true });
  await Customer.deleteMany({ isDeleted: true });

  res.json({ message: 'Trash Bin emptied successfully' });
});

// @desc    Get chat history for a deleted phone number (for preview before recovery/deletion)
// @route   GET /api/trash/chat/:phone
// @access  Private (Admin)
export const getTrashChat = asyncHandler(async (req, res) => {
  const { phone } = req.params;
  const messages = await WhatsAppMessage.find({ customerPhone: phone })
    .sort({ timestamp: 1 });
  
  const customer = await Customer.findOne({ phone }).lean();

  res.json({
    phone,
    customer: customer || null,
    messages: messages || [],
  });
});
