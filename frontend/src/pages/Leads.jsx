import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

import { FiEdit2, FiTrash2, FiTarget, FiSearch, FiPlus, FiEye , FiXCircle, FiClock, FiDownload } from 'react-icons/fi';

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Lakshadweep', 'Puducherry'
];

const odishaDistricts = [
  'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 
  'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 
  'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Keonjhar', 'Khordha', 
  'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 
  'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
];

const Leads = () => {
  const { user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedOnboardingType, setSelectedOnboardingType] = useState('');
  const [filterCallStatus, setFilterCallStatus] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
    customerId: '', name: '', phone: '', email: '', companyName: '', job: '',
    source: 'Website', status: 'Pending', notes: '', assignedTo: '',
    pincode: '', state: '', address: '', fullAddress: '', onboarding: '', otherReason: '', followUpDate: ''
  });

  const fetchData = async () => {
    try {
      const [leadRes, empRes] = await Promise.all([
        api.get('/customers'),
        user?.role === 'Admin' ? api.get('/users') : Promise.resolve({ data: [] })
      ]);
      setLeads(leadRes.data);
      if (user?.role === 'Admin') {
        setEmployees(empRes.data.filter(e => e.role === 'Employee'));
      }
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

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
        await api.post('/customers', { ...formData, status: 'Agree' });
        toast.success('Interested customer added successfully');
      }
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '', companyName: '', job: '', source: 'Website', status: 'New', notes: '', assignedTo: '', address: '', district: '', fullAddress: '', pincode: '', state: '', onboarding: '', otherReason: '', followUpDate: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save lead');
    }
  };

    const openEditModal = (lead) => {
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
      address: lead.address || '',
      district: lead.district || lead.address || '',
      fullAddress: lead.fullAddress || '',
      onboarding: lead.onboarding || '',
      otherReason: lead.otherReason || '',
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-CA') : ''
    });
    setIsModalOpen(true);
  };

  const deleteLead = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await api.delete(`/customers/${id}`);
        toast.success('Lead deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete lead');
      }
    }
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
  }

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
            .badge-others { background: #dbeafe; color: #1e3a8a; }
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
              <div style="margin-top: 12px;">
                <div class="meta-label">Full Address</div>
                <div class="meta-value">${customer.fullAddress || '-'}</div>
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
  }

  const [selectedViewCustomer, setSelectedViewCustomer] = useState(null);

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.phone.includes(searchTerm) ||
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEmployee = selectedEmployeeId === '' || (l.assignedTo?._id || l.assignedTo) === selectedEmployeeId;
    const matchesOnboarding = selectedOnboardingType === '' || l.onboarding === selectedOnboardingType;
    
    let matchesCallStatus = true;
    if (filterCallStatus === 'Interested') matchesCallStatus = (l.status === 'Agree' || l.status === 'Interested');
    else if (filterCallStatus === 'Not Interested') matchesCallStatus = (l.status === 'Reject' || l.status === 'Not Interested');
    else if (filterCallStatus === 'Others') matchesCallStatus = l.status === 'Others';
    
    return matchesSearch && matchesEmployee && matchesOnboarding && matchesCallStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Contacted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Interested':
      case 'Agree': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Others': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Reject':
      case 'Lost': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredLeads.map((lead) => ({
      'Date': lead.taskDate ? new Date(lead.taskDate).toLocaleDateString('en-GB') : new Date(lead.updatedAt || lead.createdAt).toLocaleDateString('en-GB'),
      'Customer Name': lead.name || '',
      'Mobile Number': lead.phone || '',
      'District': lead.district || lead.address || '',
      'Onboarding Type': lead.onboarding || '',
      'Assigned To': lead.assignedTo?.name || 'Unassigned',
      'Status': lead.status === 'Agree' ? 'Interested' : lead.status === 'Reject' ? 'Rejected' : lead.status,
      'Remarks': lead.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 40 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    let fileName = 'Total_Leads_Export';
    if (selectedEmployeeId) {
      const emp = employees.find(e => e._id === selectedEmployeeId);
      if (emp) fileName = `${emp.name} lead filter`;
    } else if (user?.role === 'Employee') {
      fileName = `${user.name} lead filter`;
    }
    
    const d = new Date();
    const dateString = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName} ${dateString}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            <FiTarget className="mr-2 text-primary" /> Lead Management
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.role === 'Admin' ? 'View and edit all employee leads' : 'Track and convert potential customers'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {user?.role === 'Admin' && (
            <button
              onClick={handleExportExcel}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-sm dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400"
            >
              <FiDownload className="mr-2" /> Download Excel
            </button>
          )}

          {/* Only employees can add leads, not admin */}
          {user?.role === 'Employee' && (
            <button
              onClick={() => {
                setFormData({ name: '', phone: '', email: '', companyName: '', job: '', source: 'Website', status: 'New', notes: '', assignedTo: '' });
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-sm"
            >
              <FiPlus className="mr-2" /> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, phone or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-all"
          />
        </div>
        {/* Admin Assigned By Filter */}
        {user?.role === 'Admin' && (
          <div className="w-full sm:w-48 shrink-0">
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-all"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Onboarding Type Filter */}
        <div className="w-full sm:w-48 shrink-0">
          <select
            value={selectedOnboardingType}
            onChange={(e) => setSelectedOnboardingType(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-all"
          >
            <option value="">All Onboarding Types</option>
            <option value="District Partner">District Partner</option>
            <option value="Seller">Seller</option>
            <option value="Profile Inquiry">Profile Inquiry</option>
            <option value="Interview Call">Interview Call</option>
          </select>
        </div>

        {/* Call Status Filter */}
        <div className="w-full sm:w-48 shrink-0">
          <select
            value={filterCallStatus}
            onChange={(e) => setFilterCallStatus(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="Interested">Interested</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Others">Others</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Customer Name</th>
                <th className="py-4 px-6">Mobile Number</th>
                <th className="py-4 px-6">District</th>
                <th className="py-4 px-6">Onboarding Type</th>
                <th className="py-4 px-6">Assigned To</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </td>
                </tr>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Date */}
                    <td className="py-4 px-6 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {lead.taskDate ? new Date(lead.taskDate).toLocaleDateString('en-GB') : new Date(lead.updatedAt || lead.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    {/* Customer Name */}
                    <td className="py-4 px-6">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{lead.name}</div>
                      {lead.email && <div className="text-xs text-gray-500 dark:text-gray-400">{lead.email}</div>}
                    </td>
                    {/* Mobile Number */}
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono">
                      <button 
                        onClick={() => setSelectedViewCustomer(lead)}
                        className="flex items-center gap-2 hover:text-primary transition-colors focus:outline-none"
                        title="Click to view call history and remarks"
                      >
                        {lead.phone}
                        {lead.callHistory && lead.callHistory.length > 1 && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full" title={`${lead.callHistory.length} calls made`}>
                            ({lead.callHistory.length})
                          </span>
                        )}
                      </button>
                    </td>
                    {/* District */}
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                      {lead.district || lead.address || <span className="text-gray-400 italic">—</span>}
                    </td>
                    {/* Onboarding Type */}
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                      {lead.onboarding ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                          {lead.onboarding}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    {/* Assigned To */}
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                      {lead.assignedTo?.name || <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    {/* Status badge & Reason */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                        {lead.status === 'Agree' && lead.notes && (
                          <span 
                            className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 max-w-[200px] truncate"
                            title={lead.notes}
                          >
                            {lead.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Actions — edit always shown; delete only for admin */}
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => setSelectedViewCustomer(lead)}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer border border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border-blue-800 dark:text-blue-400"
                          title="View / Edit Details"
                        >
                          <FiEye size={14} /> View
                        </button>
                        <button
                          onClick={() => openEditModal(lead)}
                          className="text-gray-400 hover:text-primary transition-colors cursor-pointer"
                          title="Edit Lead"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        {user?.role === 'Admin' && (
                          <button
                            onClick={() => deleteLead(lead._id)}
                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete Lead"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">
                    No leads found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {formData._id ? 'Edit Lead' : 'Add New Lead'}
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
                    maxLength={10}
                    title="Phone number must be exactly 10 digits and cannot start with 0"
                    placeholder="9876543210"
                    value={formData.phone} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      if (val.startsWith('0')) val = val.substring(1); // Remove leading zero
                      setFormData({...formData, phone: val});
                    }}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Onboarding Option</label>
                  <select 
                    value={formData.onboarding || ''} 
                    onChange={(e) => setFormData({...formData, onboarding: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white appearance-none"
                  >
                    <option value="">Select Onboarding Option</option>
                    <option value="District Partner">District Partner</option>
                    <option value="Seller">Seller</option>
                    <option value="Profile Inquiry">Profile Inquiry</option>
                    <option value="Interview Call">Interview Call</option>
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
                    value={formData.district || formData.address || ''} 
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    list={formData.state === 'Odisha' ? 'odisha-districts-lead' : undefined}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                    placeholder="District Name"
                  />
                  {formData.state === 'Odisha' && (
                    <datalist id="odisha-districts-lead">
                      {odishaDistricts.map(d => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Address</label>
                  <input 
                    type="text" 
                    value={formData.fullAddress || ''} 
                    onChange={(e) => setFormData({...formData, fullAddress: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                    placeholder="Full Address"
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
                <div className="md:col-span-2 mt-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Call Status & Feedback</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Status</label>
                      <select 
                        value={formData.status || 'Pending'} 
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Agree">Interested</option>
                        <option value="Reject">Rejected</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    {formData.status === 'Others' && (
                      <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                        <input 
                          type="text" 
                          value={formData.otherReason || ''} 
                          onChange={(e) => setFormData({...formData, otherReason: e.target.value})}
                          placeholder="Why others?"
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                        />
                      </div>
                    )}

                    {formData.status === 'Agree' && (
                      <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Follow-up Date</label>
                        <input 
                          type="date" 
                          value={formData.followUpDate || ''} 
                          onChange={(e) => setFormData({...formData, followUpDate: e.target.value})}
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2 mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks / Notes</label>
                  <textarea 
                    rows={3}
                    value={formData.notes || ''} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Enter discussion remarks..."
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white resize-none"
                  />
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSubmit} className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium shadow-sm shadow-primary/30">
                {formData._id ? 'Save Changes' : 'Create Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedViewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Lead Profile Report</h3>
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
                    <div className="text-xs text-gray-400 font-semibold uppercase">District</div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedViewCustomer.address || '-'}</div>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-gray-400 font-semibold uppercase">Full Address</div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedViewCustomer.fullAddress || '-'}</div>
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
                        selectedViewCustomer.status === 'Others' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
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
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{selectedViewCustomer.otherReason}</div>
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
                              log.status === 'Others' ? 'text-blue-600' :
                              'text-yellow-600'
                            }`}>{log.status === 'Agree' ? 'Interested' : log.status === 'Reject' ? 'Rejected' : log.status}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">"{log.remark || 'No specific remark'}"</span>
                            {log.employeeName && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md w-max border border-gray-200 dark:border-gray-600">
                                Caller: {log.employeeName}
                              </span>
                            )}
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
    </div>
  );
};

export default Leads;
