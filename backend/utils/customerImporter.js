import xlsx from 'xlsx';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { reindexCustomers } from './reindexer.js';

// Helper to find a value in a case-insensitive way with alternative column names
const getValue = (row, possibleKeys) => {
  const rowKeys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const matchedKey = rowKeys.find(k => k.trim().toLowerCase() === pKey.toLowerCase());
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return String(row[matchedKey]).trim();
    }
  }
  return '';
};

export const importCustomersFromFile = async (filePath, employeeId, taskDate) => {
  try {
    const today = taskDate || new Date().toISOString().split('T')[0];

    // 1. Read sheet data
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (!rawData || rawData.length === 0) {
      return 0;
    }

    // 2. Delete only the customers for this employee on this specific date (preserve other dates)
    await Customer.deleteMany({ assignedTo: employeeId, taskDate: today });

    // Re-index remaining database entries to close any gaps from deleted customers
    await reindexCustomers();

    // Find the highest existing customer ID to avoid duplicates if re-indexing missed something
    const lastCustomer = await Customer.findOne().sort({ customerId: -1 });
    let startCount = 0;
    if (lastCustomer && lastCustomer.customerId) {
      const match = lastCustomer.customerId.match(/\d+/);
      if (match) {
        startCount = parseInt(match[0], 10);
      }
    }

    // 3. Map keys and save customers
    let importCount = 0;
    for (const row of rawData) {
      const name = getValue(row, ['name', 'customer name', 'fullname', 'full name', 'client name', 'customer_name', 'first name', 'client', 'name / designation', 'name/designation', 'contact name']);
      const phone = getValue(row, ['phone', 'phone number', 'mobile', 'contact', 'phone_number', 'mobile number', 'mobile_no', 'phone_no', 'mobileno', 'phoneno', 'telephone']);
      const email = getValue(row, ['email', 'email address', 'email_address', 'mail', 'email id']);
      const companyName = getValue(row, ['company', 'company name', 'company_name', 'organization', 'firm', 'business']);
      const address = getValue(row, ['address', 'location', 'city', 'street', 'district']);
      const pincode = getValue(row, ['pincode', 'pin', 'pin code', 'zip', 'zipcode', 'zip code', 'pin number']);
      const state = getValue(row, ['state', 'region', 'province']);

      // Skip rows without name and phone (or email)
      if (!name || !phone) {
        continue;
      }

      const customerId = `cus-${String(startCount + importCount + 1).padStart(3, '0')}`;

      try {
        await Customer.create({
          customerId,
          name,
          phone,
          email: email || `${phone}@temp.com`,
          companyName,
          address,
          pincode,
          state,
          status: 'Pending',
          assignedTo: employeeId,
          taskDate: today,
        });
        importCount++;
      } catch (rowErr) {
        console.error(`Failed to import row for ${name}:`, rowErr.message);
      }
    }

    // 4. Update the user's assignedCallsCount to the number of imported customers
    await User.findByIdAndUpdate(employeeId, { assignedCallsCount: importCount });

    // Perform a final re-indexing pass
    await reindexCustomers();

    return importCount;
  } catch (error) {
    console.error('Error importing customers from file:', error);
    throw error;
  }
};
