import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiRefreshCw, FiWifi, FiWifiOff, FiClock, FiPhone, FiDownload, FiUpload, FiX, FiEye, FiFileText } from 'react-icons/fi';

const formatSeconds = (sec = 0) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
};

const Team = () => {
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'Employee', assignedCallsCount: 0, isActive: true });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewEmployeeModal, setViewEmployeeModal] = useState({ open: false, employee: null });

  // ── Script Management ────────────────────────────────────────────────────────
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [scriptsData, setScriptsData] = useState({ sellerScript: '', districtPartnerScript: '' });
  const [savingScripts, setSavingScripts] = useState(false);
  const [activeScriptTab, setActiveScriptTab] = useState('seller');

  const handleOpenScriptModal = async () => {
    setIsScriptModalOpen(true);
    try {
      const { data } = await api.get('/settings');
      setScriptsData({ sellerScript: data.sellerScript || '', districtPartnerScript: data.districtPartnerScript || '' });
    } catch (e) {
      console.error(e);
      toast.error('Failed to load scripts');
    }
  };

  const handleSaveScripts = async () => {
    setSavingScripts(true);
    try {
      await api.put('/settings', scriptsData);
      toast.success('Scripts updated successfully');
      setIsScriptModalOpen(false);
    } catch (e) {
      toast.error('Failed to save scripts');
    } finally {
      setSavingScripts(false);
    }
  };

  // ── Daily Task Upload ────────────────────────────────────────────────────────
  const [uploadModal, setUploadModal] = useState({ open: false, employee: null });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCalls, setUploadCalls] = useState(0);
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null); // employee _id
  const [taskHistory, setTaskHistory] = useState({}); // { empId: [...dates] }
  const [loadingHistory, setLoadingHistory] = useState({});

  const openUploadModal = (emp) => {
    setUploadFile(null);
    setUploadDate(new Date().toISOString().split('T')[0]);
    setUploadModal({ open: true, employee: emp });
  };

  const toggleHistory = async (empId) => {
    if (expandedEmployee === empId) { setExpandedEmployee(null); return; }
    setExpandedEmployee(empId);
    if (taskHistory[empId]) return; // already loaded
    setLoadingHistory(h => ({ ...h, [empId]: true }));
    try {
      const { data } = await api.get(`/users/${empId}/task-history`);
      setTaskHistory(h => ({ ...h, [empId]: data }));
    } catch (error) {
      toast.error('Failed to load task history');
    } finally {
      setLoadingHistory(h => ({ ...h, [empId]: false }));
    }
  };

  const handleUploadTask = async (e) => {
    e.preventDefault();
    if (!uploadFile) { toast.error('Please select an Excel or CSV file'); return; }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('customerFile', uploadFile);
      fd.append('taskDate', uploadDate);
      await api.post(`/users/${uploadModal.employee._id}/upload-tasks`, fd);
      toast.success(`Daily tasks uploaded for ${uploadModal.employee.name}!`);
      // Refresh history for this employee
      setTaskHistory(h => { const n = {...h}; delete n[uploadModal.employee._id]; return n; });
      setUploadModal({ open: false, employee: null });
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadEmployeeExcel = async (employeeId, employeeName, date = null) => {
    try {
      const params = [`employeeId=${employeeId}`];
      if (date) params.push(`date=${date}`);
      const response = await api.get(`/customers/export/excel?${params.join('&')}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      const dateStr = date || new Date().toISOString().slice(0, 10);
      a.download = `${employeeName.replace(/\s+/g, '_')}_Tasks_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${date ? `tasks for ${date}` : 'all tasks'} for ${employeeName}`);
    } catch (error) {
      toast.error('Failed to download task list');
    }
  };

  const deleteHistoryDate = async (empId, date) => {
    if (!window.confirm(`Are you sure you want to permanently delete all tasks for ${date}?`)) return;
    try {
      const res = await api.delete(`/users/${empId}/tasks/${date}`);
      const newCount = res.data?.assignedCallsCount ?? '';
      toast.success(`Tasks deleted! Assigned Calls updated to ${newCount}`);
      // Refresh the employee row (to update assignedCallsCount badge)
      await fetchEmployees();
      // Refresh task history panel for this employee
      const { data } = await api.get(`/users/${empId}/task-history`);
      setTaskHistory(prev => ({ ...prev, [empId]: data }));
    } catch (error) {
      toast.error('Failed to delete tasks');
    }
  };

  const viewHistoryDate = (emp, row) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Task Summary - ${emp.name} - ${row.date}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Outfit', sans-serif; padding: 36px; color: #1f2937; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 28px; }
            .title { font-size: 24px; font-weight: 800; color: #312e81; letter-spacing: -0.02em; }
            .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
            .card { border-radius: 14px; padding: 16px; }
            .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; opacity: 0.6; margin-bottom: 6px; }
            .card-value { font-size: 26px; font-weight: 800; }
            .blue { background: #eff6ff; color: #1d4ed8; }
            .purple { background: #faf5ff; color: #7e22ce; }
            .green { background: #f0fdf4; color: #15803d; }
            .red { background: #fef2f2; color: #b91c1c; }
            .gray { background: #f9fafb; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">📅 Date-Wise Task Summary</div>
              <div class="subtitle">Employee: ${emp.name} &nbsp;·&nbsp; Date: ${row.date}</div>
            </div>
          </div>
          <div class="grid">
            <div class="card blue"><div class="card-label">Total Assigned</div><div class="card-value">${row.total}</div></div>
            <div class="card purple"><div class="card-label">Pending</div><div class="card-value">${row.pending}</div></div>
            <div class="card green"><div class="card-label">Interested</div><div class="card-value">${row.agree}</div></div>
            <div class="card red"><div class="card-label">Rejected</div><div class="card-value">${row.reject}</div></div>
            <div class="card gray"><div class="card-label">Others</div><div class="card-value">${row.others}</div></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/users/status?date=${selectedDate}`);
      setEmployees(data);
    } catch (error) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // Auto-refresh every 30s
    const interval = setInterval(fetchEmployees, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleAddClick = () => {
    setFormData({ name: '', email: '', phone: '', password: '', role: 'Employee', assignedCallsCount: 0 });
    setSelectedFile(null);
    setEditingEmployeeId(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEditClick = (emp) => {
    setIsEditMode(true);
    setEditingEmployeeId(emp._id);
    setFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      password: '',
      role: emp.role || 'Employee',
      assignedCallsCount: emp.assignedCallsCount || 0,
      isActive: emp.isActive !== false
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Explicit Validation
    if (!/^[1-9][0-9]{9}$/.test(formData.phone)) {
      toast.error('Phone number must be exactly 10 digits and cannot start with 0');
      return;
    }
    if (formData.password) {
      if (formData.password.length < 6 || formData.password.length > 8 || !/^[A-Z]/.test(formData.password) || !/[^a-zA-Z0-9\s]/.test(formData.password)) {
        toast.error('Password must be 6 to 8 characters, start with a capital letter, and contain a special character');
        return;
      }
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('role', formData.role);
      formDataToSend.append('isActive', formData.isActive);
      if (formData.password) {
        formDataToSend.append('password', formData.password);
      }
      if (selectedFile) {
        formDataToSend.append('customerFile', selectedFile);
      }

      if (isEditMode) {
        await api.put(`/users/${editingEmployeeId}`, formDataToSend);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/auth/register', formDataToSend);
        toast.success('Employee created successfully');
      }
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'Employee', isActive: true });
      setSelectedFile(null);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Employee deleted');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const onlineCount = employees.filter(e => e.isOnline).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiUser className="text-primary" /> Employee Management
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage team members &amp; monitor activity in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={fetchEmployees} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-xl transition-colors">
            <FiRefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleOpenScriptModal} className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-2 rounded-xl transition-colors font-medium">
            <FiFileText size={14} /> Manage Scripts
          </button>
          <button
            onClick={handleAddClick}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <FiPlus /> Add Employee
          </button>
        </div>
      </div>

      {/* Live Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Employees</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{employees.length}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wider flex items-center gap-1"><FiWifi size={11}/> Online Now</p>
          <p className="text-3xl font-bold text-green-700 dark:text-green-400 mt-1">{onlineCount}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-4">
          <p className="text-xs text-red-500 font-medium uppercase tracking-wider flex items-center gap-1"><FiWifiOff size={11}/> Offline</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{employees.length - onlineCount}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
          <p className="text-xs text-blue-500 font-medium uppercase tracking-wider flex items-center gap-1"><FiClock size={11}/> Avg Session</p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-1">
            {employees.length > 0
              ? Math.floor(employees.reduce((a, e) => a + (e.todayWorkingSeconds || 0), 0) / employees.length / 60) + 'm'
              : '0m'}
          </p>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="py-4 px-5">Employee</th>
                <th className="py-4 px-5">Employee ID</th>
                <th className="py-4 px-5">Contact</th>
                <th className="py-4 px-5 text-center">Assigned Calls</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-center">Session Time</th>
                <th className="py-4 px-5 text-center">Last Seen</th>
                <th className="py-4 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </td>
                </tr>
              ) : employees.length > 0 ? (
                employees.map((emp) => (
                  <React.Fragment key={emp._id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Name */}
                    <td className="py-4 px-5">
                      <div 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setViewEmployeeModal({ open: true, employee: emp })}
                        title="Click to view details"
                      >
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            {emp.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${emp.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 group-hover:text-primary transition-colors">{emp.name}</p>
                          <p className="text-xs text-gray-400 group-hover:text-gray-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* rest of columns */}
                    <td className="py-4 px-5 text-sm text-gray-600 dark:text-gray-400 font-mono">{emp.employeeId || '—'}</td>
                    <td className="py-4 px-5 text-sm text-gray-600 dark:text-gray-400"><span className="flex items-center gap-1"><FiPhone size={12} /> {emp.phone || '—'}</span></td>
                    <td className="py-4 px-5 text-center font-semibold text-sm text-gray-700 dark:text-gray-200">{emp.assignedCallsCount || 0}</td>
                    <td className="py-4 px-5 text-center">
                      {emp.isActive === false ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Inactive
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${emp.isOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                          {emp.isOnline ? 'Online' : 'Offline'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="flex items-center justify-center gap-1 text-sm font-mono text-gray-700 dark:text-gray-200">
                        <FiClock size={13} className="text-blue-400" />
                        {formatSeconds(emp.todayWorkingSeconds || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center text-xs text-gray-400">{emp.lastSeenAt ? new Date(emp.lastSeenAt).toLocaleTimeString() : '—'}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openUploadModal(emp)} className="text-gray-400 hover:text-primary transition-colors" title="Upload Daily Tasks"><FiUpload size={15} /></button>
                        <button onClick={() => downloadEmployeeExcel(emp._id, emp.name)} className="text-gray-400 hover:text-green-500 transition-colors" title="Download All Tasks"><FiDownload size={15} /></button>
                        <button onClick={() => handleEditClick(emp)} className="text-gray-400 hover:text-primary transition-colors" title="Edit"><FiEdit2 size={15} /></button>
                        <button onClick={() => handleDelete(emp._id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete"><FiTrash2 size={15} /></button>
                        {/* History toggle */}
                        <button
                          onClick={() => toggleHistory(emp._id)}
                          className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors border ${
                            expandedEmployee === emp._id
                              ? 'bg-primary text-white border-primary'
                              : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:text-primary hover:border-primary'
                          }`}
                          title="Date-wise History"
                        >
                          📅 History
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* ── Date-wise History Expandable Row ── */}
                  {expandedEmployee === emp._id && (
                    <tr>
                      <td colSpan="8" className="bg-gray-50 dark:bg-gray-900/40 px-5 py-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">📅 Date-wise Task History — {emp.name}</p>
                        {loadingHistory[emp._id] ? (
                          <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
                        ) : taskHistory[emp._id]?.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="text-xs font-semibold text-gray-400 uppercase">
                                  <th className="text-left pb-2 pr-4">Date</th>
                                  <th className="text-left pb-2 px-3">File Name</th>
                                  <th className="text-center pb-2 px-3">Total</th>
                                  <th className="text-center pb-2 px-3">Pending</th>
                                  <th className="text-center pb-2 px-3 text-green-600">Interested</th>
                                  <th className="text-center pb-2 px-3 text-red-500">Rejected</th>
                                  <th className="text-center pb-2 px-3">Others</th>
                                  <th className="text-center pb-2 px-3">Completed %</th>
                                  <th className="text-center pb-2 px-3">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {taskHistory[emp._id].map(row => {
                                  const pct = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
                                  return (
                                    <tr key={`${row.date}-${row.file}`} className="hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                      <td className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                        {new Date(row.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                      </td>
                                      <td className="py-2 px-3">
                                        {row.file ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            📎 {row.file}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-gray-400">—</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-center font-bold">{row.total}</td>
                                      <td className="py-2 px-3 text-center text-yellow-600 font-semibold">{row.pending}</td>
                                      <td className="py-2 px-3 text-center text-green-600 font-semibold">{row.agree}</td>
                                      <td className="py-2 px-3 text-center text-red-500 font-semibold">{row.reject}</td>
                                      <td className="py-2 px-3 text-center text-gray-500">{row.others}</td>
                                      <td className="py-2 px-3 text-center">
                                        <div className="flex items-center gap-2 justify-center">
                                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{pct}%</span>
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            onClick={() => viewHistoryDate(emp, row)}
                                            className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                            title="View Summary"
                                          >
                                            <FiEye size={14} />
                                          </button>
                                          <button
                                            onClick={() => downloadEmployeeExcel(emp._id, `${emp.name}_${row.date}`, row.date)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold transition-colors"
                                          >
                                            <FiDownload size={12} /> Excel
                                          </button>
                                          <button
                                            onClick={() => deleteHistoryDate(emp._id, row.date)}
                                            className="inline-flex items-center justify-center w-7 h-7 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                            title="Delete Date Tasks"
                                          >
                                            <FiTrash2 size={14} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-4">No task history found for this employee.</p>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-gray-400">No employees found. Add your first employee above!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Daily Task Upload Modal ──────────────────────────────────────── */}
      {uploadModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-secondary/5">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <FiUpload className="text-primary" /> Upload Daily Tasks
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  For: <span className="font-semibold text-primary">{uploadModal.employee?.name}</span>
                </p>
              </div>
              <button onClick={() => setUploadModal({ open: false, employee: null })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadTask} className="p-6 space-y-5">

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Customer Task Excel File <span className="text-red-500">*</span>
                </label>
                <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  uploadFile
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 hover:border-primary hover:bg-primary/5'
                }`}>
                  {uploadFile ? (
                    <div className="text-center px-4">
                      <div className="text-3xl mb-1">📊</div>
                      <p className="text-sm font-semibold text-primary truncate max-w-[280px]">{uploadFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB · Click to change</p>
                    </div>
                  ) : (
                    <div className="text-center px-4">
                      <FiUpload className="mx-auto text-gray-400 text-3xl mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-primary">Click to upload</span> or drag & drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Excel (.xlsx, .xls) or CSV · Max 10MB</p>
                    </div>
                  )}
                  <input
                    type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => setUploadFile(e.target.files[0] || null)}
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Task Date <span className="text-xs text-gray-400">(which day is this task for?)</span>
                </label>
                <input
                  type="date" required
                  max={new Date().toISOString().split('T')[0]}
                  value={uploadDate}
                  onChange={e => setUploadDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setUploadModal({ open: false, employee: null })}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-md shadow-primary/20"
                >
                  {isUploading ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Uploading...</>
                  ) : (
                    <><FiUpload size={15} /> Upload Tasks</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {isEditMode ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text" required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address (Login ID)</label>
                <input
                  type="email" required
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  pattern="^[1-9][0-9]{9}$"
                  title="Phone number must be exactly 10 digits and cannot start with 0"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isEditMode ? 'New Password (leave blank to keep current)' : 'Initial Password'}
                </label>
                <input
                  type="password"
                  required={!isEditMode}
                  minLength={6}
                  maxLength={8}
                  pattern="^[A-Z].*[^a-zA-Z0-9\s].*$"
                  title="Password must be 6 to 8 characters, start with a capital letter and contain at least one special character"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full bg-gray-50 dark:bg-gray-700 border rounded-xl px-4 py-2.5 outline-none focus:ring-2 text-gray-800 dark:text-white ${
                    formData.password && (formData.password.length < 6 || formData.password.length > 8 || !/^[A-Z]/.test(formData.password) || !/[^a-zA-Z0-9\s]/.test(formData.password))
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-200 dark:border-gray-600 focus:ring-primary'
                  }`}
                />
                {formData.password && (formData.password.length < 6 || formData.password.length > 8 || !/^[A-Z]/.test(formData.password) || !/[^a-zA-Z0-9\s]/.test(formData.password)) && (
                  <p className="text-red-500 text-xs mt-1">
                    Password must be 6 to 8 characters, start with a capital letter, and contain a special character.
                  </p>
                )}
              </div>

              {isEditMode && (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">Account Status</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">If inactive, the employee cannot log in.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium">
                  {isEditMode ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Details Modal */}
      {viewEmployeeModal.open && viewEmployeeModal.employee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {viewEmployeeModal.employee.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    {viewEmployeeModal.employee.name}
                  </h3>
                  <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                    {viewEmployeeModal.employee.employeeId || 'No ID'}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewEmployeeModal({ open: false, employee: null })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Information</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FiPhone size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone Number</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{viewEmployeeModal.employee.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email Address</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 break-all">{viewEmployeeModal.employee.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Security Credentials</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current Password</p>
                    <p className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                      {viewEmployeeModal.employee.plainPassword || '•••••••• (Encrypted)'}
                    </p>
                  </div>
                </div>
                {!viewEmployeeModal.employee.plainPassword && (
                  <p className="text-[11px] text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                    This account was created before password viewing was enabled. You must reset their password via the Edit button to see it here.
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 pt-0">
              <button 
                onClick={() => setViewEmployeeModal({ open: false, employee: null })}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Scripts Modal ── */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FiFileText className="text-primary" /> Manage Calling Scripts
              </h3>
              <button onClick={() => setIsScriptModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <div className="p-0 flex flex-col h-[60vh]">
              <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                <button
                  onClick={() => setActiveScriptTab('seller')}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${activeScriptTab === 'seller' ? 'text-primary border-b-2 border-primary bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Seller Script
                </button>
                <button
                  onClick={() => setActiveScriptTab('districtPartner')}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${activeScriptTab === 'districtPartner' ? 'text-secondary border-b-2 border-secondary bg-white dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  District Partner Script
                </button>
              </div>
              <div className="flex-1 p-6 flex flex-col">
                <p className="text-xs text-gray-500 mb-3 font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                  Use {'{Name}'} for customer name and {'{Company}'} for company name. Double-Enter (new line) separates the script into highlighted steps for the caller.
                </p>
                {activeScriptTab === 'seller' ? (
                  <textarea
                    value={scriptsData.sellerScript}
                    onChange={(e) => setScriptsData({ ...scriptsData, sellerScript: e.target.value })}
                    className="flex-1 w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Enter seller script here..."
                  />
                ) : (
                  <textarea
                    value={scriptsData.districtPartnerScript}
                    onChange={(e) => setScriptsData({ ...scriptsData, districtPartnerScript: e.target.value })}
                    className="flex-1 w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-secondary focus:border-secondary outline-none"
                    placeholder="Enter district partner script here..."
                  />
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsScriptModalOpen(false)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveScripts}
                disabled={savingScripts}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-70 text-white font-semibold rounded-xl transition-colors shadow-md flex items-center gap-2"
              >
                {savingScripts ? 'Saving...' : 'Save Scripts'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Team;
