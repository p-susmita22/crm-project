import xlsx from 'xlsx';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { reindexCustomers } from './reindexer.js';

// Helper to normalize keys by removing all spaces, underscores, and special characters
const normalizeKey = (key) => key ? String(key).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';

export const importCustomersFromFile = async (filePathOrBuffer, employeeId, taskDate, originalFileName = '') => {
  try {
    const today = taskDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

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

    // Find the highest existing customer ID to avoid duplicates
    const allCustomers = await Customer.find({}, 'customerId').lean();
    let maxCount = 0;
    for (const c of allCustomers) {
      if (c.customerId) {
        const match = c.customerId.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxCount) maxCount = num;
        }
      }
    }

    // Determine column indices
    let nameIdx = -1, phoneIdx = -1, emailIdx = -1, companyIdx = -1, addressIdx = -1, pincodeIdx = -1, stateIdx = -1, districtIdx = -1;

    if (hasHeaders) {
      const getIdx = (keys) => headerRow.findIndex(h => keys.includes(normalizeKey(h)));
      nameIdx = getIdx(['name', 'customername', 'fullname', 'clientname', 'firstname', 'client', 'contactname', 'contactperson', 'person', 'leadname', 'namedesignation', 'buyer', 'seller', 'party']);
      phoneIdx = getIdx(['phone', 'phonenumber', 'mobile', 'contact', 'mobilenumber', 'mobileno', 'contactno', 'phoneno', 'telephone', 'contactnumber', 'phno', 'ph', 'tel', 'whatsapp', 'whatsappnumber', 'whatsappno', 'task', 'tasks']);
      emailIdx = getIdx(['email', 'emailaddress', 'mail', 'emailid']);
      companyIdx = getIdx(['company', 'companyname', 'organization', 'firm', 'business', 'agency']);
      addressIdx = getIdx(['address', 'location', 'city', 'street', 'area', 'region']);
      pincodeIdx = getIdx(['pincode', 'pin', 'zip', 'zipcode', 'pinnumber']);
      stateIdx = getIdx(['state', 'province']);
      districtIdx = getIdx(['district']);
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
      const district = districtIdx !== -1 && row[districtIdx] !== undefined ? String(row[districtIdx]).trim() : '';

      const finalName = name; // Now optional
      const finalPhone = phone;
      const finalEmail = email; // Now optional

      try {
        let existingCustomer = await Customer.findOne({ phone: finalPhone });

        if (existingCustomer) {
          existingCustomer.name = finalName || existingCustomer.name;
          existingCustomer.email = finalEmail || existingCustomer.email;
          existingCustomer.companyName = companyName || existingCustomer.companyName;
          existingCustomer.address = address || existingCustomer.address;
          existingCustomer.pincode = pincode || existingCustomer.pincode;
          existingCustomer.state = state || existingCustomer.state;
          existingCustomer.district = district || existingCustomer.district;
          existingCustomer.assignedTo = employeeId;
          existingCustomer.taskDate = today;
          existingCustomer.sourceFile = originalFileName || existingCustomer.sourceFile;
          
          await existingCustomer.save();
          importCount++;
        } else {
          const customerId = `cus-${String(maxCount + importCount + 1).padStart(3, '0')}`;
          await Customer.create({
            customerId,
            name: finalName,
            phone: finalPhone,
            email: finalEmail,
            companyName,
            address,
            pincode,
            state,
            district,
            status: 'Pending',
            assignedTo: employeeId,
            taskDate: today,
            sourceFile: originalFileName,
            callHistory: [{ status: 'Pending', remark: 'Imported from Excel' }]
          });
          importCount++;
        }
      } catch (rowErr) {
        console.error(`Failed to import row for ${name}:`, rowErr.message);
      }
    }

    // 4. Recalculate assignedCallsCount from actual customer records (same as delete logic)
    const totalRemaining = await Customer.countDocuments({ assignedTo: employeeId });
    await User.findByIdAndUpdate(employeeId, { assignedCallsCount: totalRemaining });



    return importCount;
  } catch (error) {
    console.error('Error importing customers from file:', error);
    throw error;
  }
};
