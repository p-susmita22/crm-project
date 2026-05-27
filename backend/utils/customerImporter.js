import xlsx from 'xlsx';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { reindexCustomers } from './reindexer.js';

// Helper to normalize keys by removing all spaces, underscores, and special characters
const normalizeKey = (key) => key ? String(key).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';

export const importCustomersFromFile = async (filePathOrBuffer, employeeId, taskDate) => {
  try {
    const today = taskDate || new Date().toISOString().split('T')[0];

    // 1. Read sheet data — supports both Buffer (memory storage) and file path (disk)
    const workbook = Buffer.isBuffer(filePathOrBuffer)
      ? xlsx.read(filePathOrBuffer, { type: 'buffer' })
      : xlsx.readFile(filePathOrBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rawData || rawData.length === 0) {
      return 0;
    }

    // Filter out completely empty rows
    const dataRows = rawData.filter(row => row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''));
    if (dataRows.length === 0) return 0;

    // Detect if the first row is a header row
    // Scan the first 10 rows to find the actual header row (ignoring title rows)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(dataRows.length, 10); i++) {
      const normalizedCells = dataRows[i].map(c => normalizeKey(c));
      // Require an exact match on common header columns to prevent false positives
      const isHeaderRow = normalizedCells.some(c => 
        ['name', 'customername', 'fullname', 'firstname', 'clientname', 'contactname', 'phone', 'phonenumber', 'mobile', 'mobileno', 'contactno', 'contactnumber', 'phno', 'task', 'tasks'].includes(c)
      );
      if (isHeaderRow) {
        headerRowIndex = i;
        break;
      }
    }

    let headerRow = [];
    const hasHeaders = headerRowIndex !== -1;
    if (hasHeaders) {
      headerRow = dataRows[headerRowIndex];
      // Discard all title rows AND the header row, leaving only true data rows
      dataRows.splice(0, headerRowIndex + 1);
    }

    // 2. We no longer delete the existing customers for this date.
    // The new excel data will be appended to the existing list.

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

    // Determine column indices
    let nameIdx = -1, phoneIdx = -1, emailIdx = -1, companyIdx = -1, addressIdx = -1, pincodeIdx = -1, stateIdx = -1;

    if (hasHeaders) {
      const getIdx = (keys) => headerRow.findIndex(h => keys.includes(normalizeKey(h)));
      nameIdx = getIdx(['name', 'customername', 'fullname', 'clientname', 'firstname', 'client', 'contactname', 'contactperson', 'person', 'leadname', 'namedesignation', 'buyer', 'seller', 'party']);
      phoneIdx = getIdx(['phone', 'phonenumber', 'mobile', 'contact', 'mobilenumber', 'mobileno', 'contactno', 'phoneno', 'telephone', 'contactnumber', 'phno', 'ph', 'tel', 'whatsapp', 'whatsappnumber', 'whatsappno', 'task', 'tasks']);
      emailIdx = getIdx(['email', 'emailaddress', 'mail', 'emailid']);
      companyIdx = getIdx(['company', 'companyname', 'organization', 'firm', 'business', 'agency']);
      addressIdx = getIdx(['address', 'location', 'city', 'street', 'district', 'area', 'region']);
      pincodeIdx = getIdx(['pincode', 'pin', 'zip', 'zipcode', 'pinnumber']);
      stateIdx = getIdx(['state', 'province']);
    } else {
      // If no headers, guess: Col 0 is Name, Col 1 is Phone
      nameIdx = 0;
      phoneIdx = 1;
    }

    // 3. Map keys and save customers
    let importCount = 0;
    for (const row of dataRows) {
      const name = nameIdx !== -1 && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';
      const phone = phoneIdx !== -1 && row[phoneIdx] !== undefined ? String(row[phoneIdx]).trim() : '';
      
      // Only count rows that actually have a contact number
      if (!phone) {
        continue;
      }

      const email = emailIdx !== -1 && row[emailIdx] !== undefined ? String(row[emailIdx]).trim() : '';
      const companyName = companyIdx !== -1 && row[companyIdx] !== undefined ? String(row[companyIdx]).trim() : '';
      const address = addressIdx !== -1 && row[addressIdx] !== undefined ? String(row[addressIdx]).trim() : '';
      const pincode = pincodeIdx !== -1 && row[pincodeIdx] !== undefined ? String(row[pincodeIdx]).trim() : '';
      const state = stateIdx !== -1 && row[stateIdx] !== undefined ? String(row[stateIdx]).trim() : '';

      const finalName = name || `Customer ${startCount + importCount + 1}`;
      const finalPhone = phone;
      const finalEmail = email || `customer${startCount + importCount + 1}@temp.com`;

      const customerId = `cus-${String(startCount + importCount + 1).padStart(3, '0')}`;

      try {
        await Customer.create({
          customerId,
          name: finalName,
          phone: finalPhone,
          email: finalEmail,
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

    // 4. Update the user's assignedCallsCount to ADD the number of imported customers
    await User.findByIdAndUpdate(employeeId, { $inc: { assignedCallsCount: importCount } });

    // Perform a final re-indexing pass
    await reindexCustomers();

    return importCount;
  } catch (error) {
    console.error('Error importing customers from file:', error);
    throw error;
  }
};
