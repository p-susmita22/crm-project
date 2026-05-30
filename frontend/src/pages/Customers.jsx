import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiSearch, FiFilter, FiDownload, FiFileText, FiEye, FiXCircle, FiCalendar, FiRefreshCw, FiSend, FiInbox } from 'react-icons/fi';

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", 
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Lakshadweep", "Puducherry"
];

const Customers = () => {
  const { user } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [adminViewEmployee, setAdminViewEmployee] = useState(null); // Used for drill-down view
  const [selectedViewCustomer, setSelectedViewCustomer] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadDate, setUploadDate] = useState('');

  // Admin Work Submissions states
  const [workSubmissions, setWorkSubmissions] = useState([]);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '', name: '', phone: '', email: '', companyName: '', address: '', assignedTo: '', job: '', pincode: '', state: '', onboarding: ''
  });

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [custRes, empRes] = await Promise.all([
        api.get('/customers'),
        user?.role === 'Admin' ? api.get('/users') : Promise.resolve({ data: [] })
      ]);
      setCustomers(custRes.data);
      if (user?.role === 'Admin') {
        setEmployees(empRes.data.filter(e => e.role === 'Employee'));
        
        // Fetch work submissions
        try {
          const wsRes = await api.get('/work-submissions');
          setWorkSubmissions(wsRes.data);
        } catch (err) {
          console.error('Failed to fetch work submissions', err);
        }
      }
      setLastRefreshed(new Date());
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds so admin sees employee-added customers
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleDownloadEmployeeExcel = async (submission) => {
    try {
      const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:5000';
      const fullUrl = `${baseUrl}${submission.fileUrl}`;
      
      const a = document.createElement('a');
      a.href = fullUrl;
      a.target = '_blank';
      a.download = submission.fileName || 'Work_Submission';
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      // Mark as read
      if (!submission.isRead) {
        await api.put(`/work-submissions/${submission._id}/read`);
        setWorkSubmissions(prev => prev.map(s => s._id === submission._id ? { ...s, isRead: true } : s));
      }
    } catch (error) {
      toast.error('Failed to open file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Explicit Validation
    if (!/^[1-9][0-9]{9}$/.test(formData.phone)) {
      toast.error('Phone number must be exactly 10 digits and cannot start with 0');
      return;
    }
    
    try {
      if (formData._id) {
        await api.put(`/customers/${formData._id}`, formData);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/customers', formData);
        toast.success('Customer created successfully');
      }
      setIsModalOpen(false);
      setFormData({ customerId: '', name: '', phone: '', email: '', companyName: '', address: '', assignedTo: '', job: '', pincode: '', state: '', onboarding: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save customer');
    }
  };

  const openEditModal = (customer) => {
    setFormData({
      _id: customer._id,
      customerId: customer.customerId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      companyName: customer.companyName || '',
      address: customer.address || '',
      assignedTo: customer.assignedTo?._id || '',
      job: customer.job || '',
      pincode: customer.pincode || '',
      state: customer.state || '',
      onboarding: customer.onboarding || ''
    });
    setIsModalOpen(true);
  };

  const handlePincodeChange = async (val) => {
    setFormData(prev => ({ ...prev, pincode: val }));
    if (val.length === 6 && /^\d+$/.test(val)) {
      try {
        const response = await api.get(`/customers/pincode/${val}`);
        const data = response.data;
        if (data && data[0] && data[0].Status === 'Success') {
          const postOffices = data[0].PostOffice;
          if (postOffices && postOffices.length > 0) {
            const po = postOffices.find(p => p.DeliveryStatus === 'Delivery') || postOffices[0];
            setFormData(prev => ({
              ...prev,
              address: po.District,
              state: po.State
            }));
            toast.success('District and State auto-resolved from Pin Code!');
          }
        }
      } catch (err) {
        console.error('Failed to resolve pincode:', err);
      }
    }
  };

  const handleDownloadPDF = (customer) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Customer Profile Report - ${customer.customerId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              padding: 40px;
              color: #1f2937;
              background-color: #ffffff;
            }
            .report-card {
              border: 1px solid #e5e7eb;
              border-radius: 24px;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 24px;
              margin-bottom: 32px;
            }
            .logo-text {
              font-size: 28px;
              font-weight: 800;
              color: #1e3a8a;
              letter-spacing: -0.025em;
            }
            .title-badge {
              background-color: #eff6ff;
              color: #1e40af;
              font-weight: 700;
              padding: 6px 14px;
              border-radius: 9999px;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .meta-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin-bottom: 32px;
            }
            .meta-block {
              background-color: #f9fafb;
              border: 1px solid #f3f4f6;
              border-radius: 16px;
              padding: 20px;
            }
            .meta-title {
              font-size: 12px;
              font-weight: 700;
              color: #3b82f6;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 12px;
            }
            .meta-field {
              margin-bottom: 12px;
            }
            .meta-field:last-child {
              margin-bottom: 0;
            }
            .meta-label {
              font-size: 11px;
              color: #6b7280;
              font-weight: 600;
              text-transform: uppercase;
            }
            .meta-value {
              font-size: 14px;
              color: #111827;
              font-weight: 600;
              margin-top: 2px;
            }
            .address-section {
              background-color: #f9fafb;
              border: 1px solid #f3f4f6;
              border-radius: 16px;
              padding: 20px;
              margin-bottom: 32px;
            }
            .notes-section {
              background-color: #fefeff;
              border: 1px dashed #d1d5db;
              border-radius: 16px;
              padding: 20px;
              margin-top: 12px;
            }
            .badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .badge-interested { background: #d1fae5; color: #065f46; }
            .badge-rejected { background: #fee2e2; color: #991b1b; }
            .badge-others { background: #f3e8ff; color: #6b21a8; }
            .badge-pending { background: #fef3c7; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="report-card">
            <div class="header">
              <div class="logo-text">CRM REPORT</div>
              <div class="title-badge">Customer ID: ${customer.customerId}</div>
            </div>
            
            <div class="meta-section">
              <div class="meta-block">
                <div class="meta-title">Personal Information</div>
                <div class="meta-field">
                  <div class="meta-label">Customer Name</div>
                  <div class="meta-value">${customer.name}</div>
                </div>
                <div class="meta-field">
                  <div class="meta-label">Phone Number</div>
                  <div class="meta-value">${customer.phone}</div>
                </div>
                <div class="meta-field">
                  <div class="meta-label">Email Address</div>
                  <div class="meta-value">${customer.email || '-'}</div>
                </div>
              </div>
              
              <div class="meta-block">
                <div class="meta-title">Employment Info</div>
                <div class="meta-field">
                  <div class="meta-label">Company Name</div>
                  <div class="meta-value">${customer.companyName || '-'}</div>
                </div>
                <div class="meta-field">
                  <div class="meta-label">Job Title</div>
                  <div class="meta-value">${customer.job || '-'}</div>
                </div>
                <div class="meta-field">
                  <div class="meta-label">Onboarding Option</div>
                  <div class="meta-value">${customer.onboarding || '-'}</div>
                </div>
              </div>
            </div>

            <div class="address-section">
              <div class="meta-title">Location & Address</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                <div>
                  <div class="meta-label">Pin Number</div>
                  <div class="meta-value">${customer.pincode || '-'}</div>
                </div>
                <div>
                  <div class="meta-label">State</div>
                  <div class="meta-value">${customer.state || '-'}</div>
                </div>
              </div>
              <div>
                <div class="meta-label">District</div>
                <div class="meta-value">${customer.address || '-'}</div>
              </div>
            </div>

            <div class="meta-block" style="grid-template-columns: 1fr; margin-bottom: 0;">
              <div class="meta-title">Interaction Details</div>
              <div style="display: flex; gap: 24px; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px;">
                <div>
                  <div class="meta-label" style="margin-bottom: 4px;">Status</div>
                  <span class="badge badge-${
                    customer.status === 'Agree' ? 'interested' :
                    customer.status === 'Reject' ? 'rejected' :
                    customer.status === 'Others' ? 'others' :
                    'pending'
                  }">
                    ${customer.status === 'Agree' ? 'Interested' :
                      customer.status === 'Reject' ? 'Rejected' :
                      customer.status === 'Others' ? 'Others' :
                      customer.status}
                  </span>
                </div>
                \${customer.status === 'Others' && customer.otherReason ? \`
                <div>
                  <div class="meta-label">Reason</div>
                  <div class="meta-value" style="color: #6b21a8;">\${customer.otherReason}</div>
                </div>
                \` : ''}
                \${customer.status === 'Agree' && customer.followUpDate ? \`
                <div>
                  <div class="meta-label">Follow-up Date</div>
                  <div class="meta-value" style="color: #047857;">\${new Date(customer.followUpDate).toLocaleDateString()}</div>
                </div>
                \` : ''}
              </div>
              <div>
                <div class="meta-label">Remarks & Notes</div>
                <div class="notes-section">
                  \${customer.notes ? \`"\${customer.notes}"\` : 'No remarks recorded.'}
                </div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Employee: download their own tasks as Excel (optionally filtered by date)
  const downloadMyExcel = async (date) => {
    try {
      const params = date ? { date } : {};
      const response = await api.get('/customers/export/excel', { responseType: 'blob', params });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = date
        ? `Customer_Tasks_${date}.xlsx`
        : `My_Customer_Tasks_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download Excel');
    }
  };

  // Employee: print all their customers as a styled PDF table
  const handleExportPDF = () => {
    const dateStr = new Date().toLocaleDateString('en-IN');
    const rows = filteredCustomers.map(c => `
      <tr>
        <td>${c.customerId}</td>
        <td>${c.name}</td>
        <td>${c.phone}</td>
        <td>${c.email || '-'}</td>
        <td>${c.companyName || '-'}</td>
        <td>${c.onboarding || '-'}</td>
        <td>${c.address || '-'}</td>
        <td class="status-${
          c.status === 'Agree' ? 'interested' :
          c.status === 'Reject' ? 'rejected' :
          c.status === 'Others' ? 'others' : 'pending'
        }">${
          c.status === 'Agree' ? 'Interested' :
          c.status === 'Reject' ? 'Rejected' :
          c.status === 'Others' ? 'Others' :
          (c.status || 'Pending')
        }</td>
        <td>${c.notes || '-'}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>My Customer Tasks - ${dateStr}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Outfit', sans-serif; padding: 32px; color: #1f2937; background: #fff; }
            .report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #059669; padding-bottom: 18px; margin-bottom: 28px; }
            .report-title { font-size: 26px; font-weight: 800; color: #064e3b; letter-spacing: -0.02em; }
            .report-meta { font-size: 12px; color: #6b7280; text-align: right; }
            .report-meta span { display: block; font-weight: 600; color: #374151; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            thead tr { background: #ecfdf5; }
            th { padding: 10px 12px; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.07em; color: #065f46; border-bottom: 2px solid #a7f3d0; }
            td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
            tr:nth-child(even) td { background: #f9fafb; }
            .status-interested { color: #065f46; font-weight: 700; }
            .status-rejected { color: #991b1b; font-weight: 700; }
            .status-others { color: #6b21a8; font-weight: 700; }
            .status-pending { color: #92400e; font-weight: 700; }
            .footer { margin-top: 28px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div>
              <div class="report-title">📋 Customer Task Report</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px;">Per-day calling task list</div>
            </div>
            <div class="report-meta">
              <span>Generated: ${dateStr}</span>
              Total Customers: ${filteredCustomers.length}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Customer Name</th><th>Contact</th><th>Email</th>
                <th>Company</th><th>Onboarding</th><th>District</th><th>Status</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">CRM System &mdash; Confidential Report &mdash; ${dateStr}</div>
          <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const deleteCustomer = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await api.delete(`/customers/${id}`);
        toast.success('Customer deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete customer');
      }
    }
  };

  // Helper: get YYYY-MM-DD string from a customer's createdAt
  const toDateStr = (c) => c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : 'Unknown';

  const filteredCustomers = customers.filter(c => {
    const matchSearch = (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );
    const matchDate = filterDate ? toDateStr(c) === filterDate : true;
    
    let matchEmployee = true;
    if (user?.role === 'Admin' && adminViewEmployee) {
      if (adminViewEmployee._id === 'unassigned') {
        matchEmployee = !c.assignedTo;
      } else {
        matchEmployee = c.assignedTo?._id === adminViewEmployee._id;
      }
    } else if (filterEmployeeId) {
      matchEmployee = c.assignedTo?._id === filterEmployeeId;
    }
    
    const matchStatus = user?.role === 'Employee' ? c.status !== 'Pending' : true;

    return matchSearch && matchDate && matchEmployee && matchStatus;
  });

  // Group filteredCustomers by date (for employee view) — sorted newest first
  const customersByDate = filteredCustomers.reduce((acc, c) => {
    const d = toDateStr(c);
    if (!acc[d]) acc[d] = [];
    acc[d].push(c);
    return acc;
  }, {});

  // Add the uploaded file date to the group if it exists
  const fileDateStr = user?.customerFile?.uploadedAt 
    ? new Date(user.customerFile.uploadedAt).toISOString().slice(0, 10)
    : null;

  if (fileDateStr && !customersByDate[fileDateStr]) {
    customersByDate[fileDateStr] = [];
  }

  const sortedDates = Object.keys(customersByDate).sort((a, b) => b.localeCompare(a));

  const uploadsBaseURL = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '/uploads') : 'http://localhost:5000/uploads';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            <FiUsers className="mr-2 text-primary" /> Customer Management
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.role === 'Admin' ? 'Manage and assign customers to telecallers' : 'View your assigned calling list'}
          </p>
        </div>
        
        {user?.role === 'Admin' && (
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-gray-400 hidden sm:block">
                Updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button 
              onClick={() => setShowSubmissionsModal(true)}
              className="relative flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2.5 rounded-xl font-bold transition-all"
            >
              <FiInbox size={18} /> Received Work
              {workSubmissions.filter(s => !s.isRead).length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full animate-pulse shadow-md">
                  {workSubmissions.filter(s => !s.isRead).length}
                </span>
              )}
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Refresh customer list"
            >
              <FiRefreshCw size={14} className={refreshing ? 'animate-spin text-primary' : ''} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
            <button 
              onClick={() => {
                setFormData({ customerId: '', name: '', phone: '', email: '', companyName: '', address: '', assignedTo: '', job: '', pincode: '', state: '', onboarding: '' });
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-sm"
            >
              <FiPlus className="mr-2" /> Add Customer
            </button>
          </div>
        )}
        {user?.role === 'Employee' && (
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.xls,.xlsx,.doc,.docx" 
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('file', file);
                if (uploadDate) formData.append('date', uploadDate);
                
                try {
                  await toast.promise(api.post('/work-submissions', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  }), {
                    loading: 'Uploading file...',
                    success: "Today's work sent to Admin successfully!",
                    error: (err) => err.response?.data?.message || 'Failed to send work'
                  });
                } finally {
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
            />
            <button
              onClick={() => {
                setUploadDate('');
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              title="Send your Excel/PDF sheet of today's work to Admin"
            >
              <FiSend size={15} /> Send Work
            </button>
            <button
              onClick={downloadMyExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              title="Download your customer tasks as Excel"
            >
              <FiDownload size={15} /> Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              title="Print / Download PDF report of your tasks"
            >
              <FiFileText size={15} /> Export PDF
            </button>
          </div>
        )}
      </div>



      {/* ── ADMIN: Employee Grid View (Default) ────────────────────────────── */}
      {user?.role === 'Admin' && !adminViewEmployee && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {employees.map(emp => {
            const empCustCount = customers.filter(c => c.assignedTo?._id === emp._id).length;
            return (
              <div 
                key={emp._id} 
                onClick={() => setAdminViewEmployee(emp)} 
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg">{emp.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{empCustCount} Assigned Customers</p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Unassigned Block */}
          <div 
            onClick={() => setAdminViewEmployee({ _id: 'unassigned', name: 'Unassigned Customers' })} 
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center font-bold text-xl group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                U
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">Unassigned</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{customers.filter(c => !c.assignedTo).length} Customers</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONDITIONAL RENDER FOR FILTERS & TABLES ───────────────────────── */}
      {(user?.role === 'Employee' || (user?.role === 'Admin' && adminViewEmployee)) && (
        <>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by ID, Name or Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
              />
            </div>
            {/* Date filter — employees only */}
            {user?.role === 'Employee' && (
              <div className="flex items-center gap-2">
                <FiCalendar className="text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors whitespace-nowrap"
                  >Clear</button>
                )}
              </div>
            )}
            <button className="flex items-center px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FiFilter className="mr-2" /> Filter
            </button>
          </div>

      {/* ── EMPLOYEE: Grouped-by-date tables ─────────────────────────────── */}
      {user?.role === 'Employee' && (
        <div className="space-y-8">
          {sortedDates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 py-12 text-center text-gray-400 text-sm">
              No customers found{filterDate ? ` for ${new Date(filterDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
            </div>
          ) : (
            sortedDates.map(dateKey => {
              const dayCustomers = customersByDate[dateKey];
              const label = new Date(dateKey).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
              return (
                <div key={dateKey}>
                  {/* Date header above each table */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FiCalendar className="text-primary" size={17} />
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-800 dark:text-white">{label}</p>
                        <p className="text-xs text-gray-400">{dayCustomers.length} customer{dayCustomers.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {/* Per-day Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setUploadDate(dateKey);
                          fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-semibold transition-colors"
                        title={`Upload & Send Work for ${dateKey}`}
                      >
                        <FiSend size={13} /> Send Work
                      </button>
                      <button
                        onClick={() => downloadMyExcel(dateKey)}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold transition-colors"
                        title={`Download Excel for ${dateKey}`}
                      >
                        <FiDownload size={13} /> Download Excel
                        {user?.role === 'Employee' && fileDateStr === dateKey && user?.customerFile?.fileName && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse shadow-md font-bold">
                            1
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Employee Customer File Download Section for this day */}
                  {user?.role === 'Employee' && fileDateStr === dateKey && user?.customerFile?.fileName && (
                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                          <FiFileText size={24} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            Assigned Customer Sheet
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Admin assigned customer details sheet for calling.
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <span className="font-semibold text-gray-600 dark:text-gray-300">File:</span> {user.customerFile.originalName}
                            </span>
                            {user.customerFile.uploadedAt && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-gray-600 dark:text-gray-300">Uploaded:</span> {new Date(user.customerFile.uploadedAt).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`${uploadsBaseURL}/${user.customerFile.fileName}`}
                        download={user.customerFile.originalName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold shadow-md shadow-primary/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                      >
                        <FiDownload size={16} /> Download Excel
                      </a>
                    </div>
                  )}

                  {/* Table for this day */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                            <th className="py-4 px-6">ID</th>
                            <th className="py-4 px-6">Customer Name</th>
                            <th className="py-4 px-6">Company Name</th>
                            <th className="py-4 px-6 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {dayCustomers.length > 0 ? (
                            dayCustomers.map((customer) => (
                              <tr key={customer._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{customer.customerId}</td>
                                <td className="py-4 px-6 text-sm font-semibold text-gray-800 dark:text-gray-200">{customer.name}</td>
                                <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">{customer.companyName || '-'}</td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center justify-center space-x-3">
                                    <button
                                      onClick={() => setSelectedViewCustomer(customer)}
                                      className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                                      title="View & Download PDF"
                                    ><FiEye size={18} /></button>
                                    <button
                                      onClick={() => openEditModal(customer)}
                                      className="text-gray-400 hover:text-primary transition-colors cursor-pointer"
                                      title="Edit"
                                    ><FiEdit2 size={16} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                                No customers added for this date yet. Download the sheet above to start calling.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── ADMIN: Flat single table (Drill-down) ─────────────────────────── */}
      {user?.role === 'Admin' && adminViewEmployee && (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center gap-4 pb-2">
            <button 
              onClick={() => {
                setAdminViewEmployee(null);
                setSearchTerm('');
              }} 
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium shadow-sm"
            >
              ← Back to Employees
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              {adminViewEmployee.name}
            </h3>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    <th className="py-4 px-6">ID</th>
                    <th className="py-4 px-6">Customer Name</th>
                    <th className="py-4 px-6">Company Name</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></td></tr>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">{customer.customerId}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-gray-800 dark:text-gray-200">{customer.name}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">{customer.companyName || '-'}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-3">
                          <button
                            onClick={() => setSelectedViewCustomer(customer)}
                            className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                            title="View & Download PDF"
                          ><FiEye size={18} /></button>
                          <button
                            onClick={() => openEditModal(customer)}
                            className="text-gray-400 hover:text-primary transition-colors cursor-pointer"
                            title="Edit"
                          ><FiEdit2 size={16} /></button>
                          <button
                            onClick={() => deleteCustomer(customer._id)}
                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete"
                          ><FiTrash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-500">No customers found for {adminViewEmployee.name}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
      
      {/* CLOSE FRAGMENT FOR CONDITIONAL RENDER */}
      {(user?.role === 'Employee' || (user?.role === 'Admin' && adminViewEmployee)) && (
        <></>
      )}
      </>
      )}

      {/* Add/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {formData._id ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer ID</label>
                  <input 
                    type="text" required readOnly={!!formData._id}
                    value={formData.customerId} onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white opacity-70 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input 
                    type="text" required 
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input 
                    type="tel" required 
                    pattern="^[1-9][0-9]{9}$"
                    title="Phone number must be exactly 10 digits and cannot start with 0"
                    placeholder="9876543210"
                    value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <input 
                    type="email" required 
                    value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                  <input 
                    type="text" 
                    value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                  <input 
                    type="text" 
                    value={formData.job} onChange={(e) => setFormData({...formData, job: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Onboarding Option</label>
                  <select 
                    value={formData.onboarding || ''} 
                    onChange={(e) => setFormData({...formData, onboarding: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white appearance-none"
                  >
                    <option value="">Select Onboarding Option</option>
                    <option value="District Partner">District Partner</option>
                    <option value="Seller">Seller</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                  <select 
                    value={formData.state || ''} 
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  >
                    <option value="">Select State</option>
                    {indianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pin Number</label>
                  <input 
                    type="text" 
                    value={formData.pincode || ''} 
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                    placeholder="e.g. 700001"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">District</label>
                  <input 
                    type="text" 
                    value={formData.address || ''} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                    placeholder="District Name"
                  />
                </div>
                {user?.role === 'Admin' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign to Employee</label>
                    <select 
                      value={formData.assignedTo} onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                    >
                      <option value="">Unassigned</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name} ({emp.email})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSubmit} className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium shadow-sm shadow-primary/30">
                {formData._id ? 'Save Changes' : 'Create Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedViewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Customer Profile Report</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">ID: {selectedViewCustomer.customerId}</p>
              </div>
              <button 
                onClick={() => setSelectedViewCustomer(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                <FiXCircle size={22} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Personal Info */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                  <span className="text-xs font-bold text-primary dark:text-blue-400 uppercase tracking-wider block mb-3">Personal details</span>
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase">Name</div>
                      <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedViewCustomer.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase">Phone Number</div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedViewCustomer.phone}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase">Email Address</div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedViewCustomer.email || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Company & Job */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                  <span className="text-xs font-bold text-primary dark:text-blue-400 uppercase tracking-wider block mb-3">Employment details</span>
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase">Company Name</div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedViewCustomer.companyName || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase">Job Title</div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedViewCustomer.job || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 md:col-span-2">
                  <span className="text-xs font-bold text-primary dark:text-blue-400 uppercase tracking-wider block mb-3">Address & Geography</span>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase">Pin Number</div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedViewCustomer.pincode || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase">State</div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedViewCustomer.state || '-'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-semibold uppercase">Address</div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedViewCustomer.address || '-'}</div>
                  </div>
                </div>

                {/* Status & Remarks */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 md:col-span-2 space-y-4">
                  <span className="text-xs font-bold text-primary dark:text-blue-400 uppercase tracking-wider block">Call Status & Remarks</span>
                  
                  <div className="flex flex-wrap gap-4 items-center border-b border-gray-100 dark:border-gray-700 pb-3">
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Status</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedViewCustomer.status === 'Agree' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        selectedViewCustomer.status === 'Reject' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        selectedViewCustomer.status === 'Others' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {selectedViewCustomer.status === 'Agree' ? 'Interested' :
                         selectedViewCustomer.status === 'Reject' ? 'Rejected' :
                         selectedViewCustomer.status === 'Others' ? 'Others' :
                         selectedViewCustomer.status}
                      </span>
                    </div>

                    {selectedViewCustomer.status === 'Others' && selectedViewCustomer.otherReason && (
                      <div>
                        <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Reason</div>
                        <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">{selectedViewCustomer.otherReason}</div>
                      </div>
                    )}

                    {selectedViewCustomer.status === 'Agree' && selectedViewCustomer.followUpDate && (
                      <div>
                        <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Follow-up Date</div>
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {new Date(selectedViewCustomer.followUpDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Remarks / Conversation Notes</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700 italic">
                      {selectedViewCustomer.notes ? `"${selectedViewCustomer.notes}"` : 'No remarks provided.'}
                    </div>
                  </div>
                </div>

                {/* Call History */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary dark:text-blue-400 uppercase tracking-wider block">Call History Log</span>
                    <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-gray-700 dark:text-gray-300">
                      Total Calls: {selectedViewCustomer.callHistory?.length || 0}
                    </span>
                  </div>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedViewCustomer.callHistory && selectedViewCustomer.callHistory.length > 0 ? (
                      [...selectedViewCustomer.callHistory].reverse().map((log, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                          <div className="flex flex-col min-w-[140px]">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{new Date(log.date).toLocaleDateString()}</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1"><FiClock size={10} />{new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className={`text-xs font-bold mb-1 ${
                              log.status === 'Agree' ? 'text-green-600' :
                              log.status === 'Reject' ? 'text-red-500' :
                              log.status === 'Others' ? 'text-purple-600' :
                              'text-yellow-600'
                            }`}>{log.status === 'Agree' ? 'Interested' : log.status === 'Reject' ? 'Rejected' : log.status}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">"{log.remark || 'No specific remark'}"</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-4 text-sm text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 italic">No call history recorded yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setSelectedViewCustomer(null)} 
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => handleDownloadPDF(selectedViewCustomer)} 
                className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium shadow-sm shadow-primary/30 cursor-pointer"
              >
                <FiDownload size={16} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Received Work Modal */}
      {showSubmissionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FiInbox className="text-purple-500" /> Employee Daily Work Submissions
              </h3>
              <button onClick={() => setShowSubmissionsModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <FiXCircle size={22} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {workSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No work submissions received yet.</div>
              ) : (
                workSubmissions.map(sub => (
                  <div key={sub._id} className={`flex items-center justify-between p-4 rounded-xl border ${sub.isRead ? 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700' : 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'}`}>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {sub.employeeName} 
                        {!sub.isRead && <span className="bg-red-500 text-white text-[10px] uppercase px-2 py-0.5 rounded-full font-bold">New</span>}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Submitted: {new Date(sub.createdAt).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => handleDownloadEmployeeExcel(sub)}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-bold transition-colors"
                    >
                      <FiDownload size={14} /> View File
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
