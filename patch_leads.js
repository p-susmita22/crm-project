const fs = require('fs');
const custCode = fs.readFileSync('frontend/src/pages/Customers.jsx', 'utf8');
let leadsCode = fs.readFileSync('frontend/src/pages/Leads.jsx', 'utf8');

// 1. Add missing imports
leadsCode = leadsCode.replace(
  /import \{([^}]+)\} from 'react-icons\/fi';/,
  "import {$1, FiXCircle, FiClock, FiDownload } from 'react-icons/fi';"
);
if (!leadsCode.includes('jspdf')) {
  leadsCode = leadsCode.replace(
    /import \{ toast \} from 'react-hot-toast';/,
    "import { toast } from 'react-hot-toast';\nimport jsPDF from 'jspdf';\nimport 'jspdf-autotable';"
  );
}

// 2. Extract indianStates
const statesMatch = custCode.match(/(const indianStates = \[\s*(?:'[^']+',\s*)*'[^']+'\s*\];)/);
if (statesMatch && !leadsCode.includes('const indianStates')) {
  leadsCode = leadsCode.replace(
    /(const Leads = \(\) => \{)/,
    `${statesMatch[1]}\n\n$1`
  );
}

// 3. Extract logic functions
const getBlock = (code, startRegex) => {
  const match = code.match(startRegex);
  if (!match) return null;
  let startIdx = match.index;
  let braceCount = 0;
  let i = startIdx;
  let started = false;
  while (i < code.length) {
    if (code[i] === '{') { braceCount++; started = true; }
    else if (code[i] === '}') { braceCount--; }
    if (started && braceCount === 0) {
      return code.substring(startIdx, i + 1);
    }
    i++;
  }
  return null;
};

const handlePincode = getBlock(custCode, /const handlePincodeChange = async \([^)]+\) => \{/);
const handleDownload = getBlock(custCode, /const handleDownloadPDF = \([^)]+\) => \{/);

if (handlePincode && !leadsCode.includes('handlePincodeChange')) {
  leadsCode = leadsCode.replace(
    /(const deleteLead = async \([^)]+\) => \{[\s\S]*?^\s*\};)/m,
    `$1\n\n  ${handlePincode}\n\n  ${handleDownload}\n\n  const [selectedViewCustomer, setSelectedViewCustomer] = useState(null);`
  );
}

// 4. Update openEditModal
const newOpenEditModal = `  const openEditModal = (lead) => {
    setFormData({
      _id: lead._id,
      customerId: lead.customerId || '',
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      companyName: lead.companyName || '',
      job: lead.job || '',
      source: lead.source || 'Website',
      status: lead.status || 'Pending',
      notes: lead.notes || '',
      assignedTo: lead.assignedTo?._id || lead.assignedTo || '',
      pincode: lead.pincode || '',
      state: lead.state || '',
      address: lead.address || lead.district || '',
      fullAddress: lead.fullAddress || '',
      onboarding: lead.onboarding || '',
      otherReason: lead.otherReason || '',
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-CA') : ''
    });
    setIsModalOpen(true);
  };`;
leadsCode = leadsCode.replace(
  /const openEditModal = \([^)]+\) => \{[\s\S]*?^\s*\};/m,
  newOpenEditModal
);

// Update initial formData state
const initialFormData = `  const [formData, setFormData] = useState({
    customerId: '', name: '', phone: '', email: '', companyName: '', job: '',
    source: 'Website', status: 'Pending', notes: '', assignedTo: '',
    pincode: '', state: '', address: '', fullAddress: '', onboarding: '', otherReason: '', followUpDate: ''
  });`;
leadsCode = leadsCode.replace(
  /const \[formData, setFormData\] = useState\(\{[\s\S]*?\}\);/,
  initialFormData
);

// 5. Replace Add/Edit Lead Modal with Add/Edit Customer Modal + View Modal
const modalsMatch = custCode.match(/(\{\/\* Add\/Edit Customer Modal \*\/\}[\s\S]*?)\{\/\* Received Work Modal \*\/\}/);
if (modalsMatch) {
  const modalsCode = modalsMatch[1];
  let customizedModals = modalsCode.replace(/'Edit Customer' : 'Add New Customer'/g, "'Edit Lead' : 'Add New Lead'");
  customizedModals = customizedModals.replace(/Create Customer/g, 'Create Lead');
  customizedModals = customizedModals.replace(/Customer Profile Report/g, 'Lead Profile Report');
  
  leadsCode = leadsCode.replace(
    /\{\/\* Add\/Edit Lead Modal \*\/\}[\s\S]*?(?=<\/div>\s*<\/div>\s*\);)/,
    customizedModals
  );
}

// 6. Update mapping of View button
leadsCode = leadsCode.replace(
  /<button\s+onClick=\{\(\) => openEditModal\(lead\)\}\s+className="flex items-center gap-1 text-xs font-semibold px-3 py-1\.5 bg-blue-50/g,
  '<button\n                          onClick={() => setSelectedViewCustomer(lead)}\n                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-50'
);

fs.writeFileSync('frontend/src/pages/Leads.jsx', leadsCode);
console.log('Successfully patched Leads.jsx!');
