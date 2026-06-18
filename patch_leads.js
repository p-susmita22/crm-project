const fs = require('fs');

const custCode = fs.readFileSync('frontend/src/pages/Customers.jsx', 'utf8');
let leadsCode = fs.readFileSync('frontend/src/pages/Leads.jsx', 'utf8');

const custLines = custCode.split('\n');

// The Add/Edit Customer Modal starts at line 1006
// The Received Work Modal starts at line 1388
// We want to extract lines 1006 to 1386 (inclusive)
let modalsCode = custLines.slice(1005, 1386).join('\n');

// Replace texts
modalsCode = modalsCode.replace(/'Edit Customer' : 'Add New Customer'/g, "'Edit Lead' : 'Add New Lead'");
modalsCode = modalsCode.replace(/Create Customer/g, 'Create Lead');
modalsCode = modalsCode.replace(/Customer Profile Report/g, 'Lead Profile Report');

const leadsLines = leadsCode.split('\n');

// In Leads.jsx, the old modal starts at line 568 and ends at 671
// Let's find exactly the line indexes
const startIndex = leadsLines.findIndex(line => line.includes('{/* Add/Edit Lead Modal */}'));
let endIndex = leadsLines.length - 5; // "    </div>", ");", "};", "export default Leads;"
for(let i = leadsLines.length - 1; i >= 0; i--) {
  if (leadsLines[i].includes('export default Leads;')) {
    endIndex = i - 3;
    break;
  }
}

// Ensure we found them
if (startIndex !== -1 && endIndex !== -1) {
  leadsLines.splice(startIndex, endIndex - startIndex + 1, modalsCode);
  fs.writeFileSync('frontend/src/pages/Leads.jsx', leadsLines.join('\n'));
  console.log('Successfully patched Leads.jsx!');
} else {
  console.error('Could not find modal boundaries in Leads.jsx');
}
