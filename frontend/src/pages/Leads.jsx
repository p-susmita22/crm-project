import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiTarget, FiSearch, FiPlus, FiEye } from 'react-icons/fi';

const Leads = () => {
  const { user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedOnboardingType, setSelectedOnboardingType] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', companyName: '', job: '',
    source: 'Website', status: 'New', notes: '', assignedTo: ''
  });

  const fetchData = async () => {
    try {
      const [leadRes, empRes] = await Promise.all([
        api.get('/customers'),
        user?.role === 'Admin' ? api.get('/users') : Promise.resolve({ data: [] })
      ]);
      const interestedCustomers = leadRes.data.filter(c => c.status === 'Agree' || c.status === 'Interested');
      setLeads(interestedCustomers);
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
      setFormData({ name: '', phone: '', email: '', companyName: '', job: '', source: 'Website', status: 'New', notes: '', assignedTo: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save lead');
    }
  };

  const openEditModal = (lead) => {
    setFormData({
      _id: lead._id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email || '',
      companyName: lead.companyName || '',
      job: lead.job || '',
      source: lead.source || 'Website',
      status: lead.status || 'New',
      notes: lead.notes || '',
      assignedTo: lead.assignedTo?._id || ''
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

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.phone.includes(searchTerm) ||
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEmployee = selectedEmployeeId === '' || (l.assignedTo?._id || l.assignedTo) === selectedEmployeeId;
    const matchesOnboarding = selectedOnboardingType === '' || l.onboarding === selectedOnboardingType;
    
    return matchesSearch && matchesEmployee && matchesOnboarding;
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
            <option value="Interview Call">Interview Call</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="py-4 px-6">Customer Name</th>
                <th className="py-4 px-6">Mobile Number</th>
                <th className="py-4 px-6">Company Name</th>
                <th className="py-4 px-6">District</th>
                <th className="py-4 px-6">Onboarding Type</th>
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
                    {/* Customer Name */}
                    <td className="py-4 px-6">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{lead.name}</div>
                      {lead.email && <div className="text-xs text-gray-500 dark:text-gray-400">{lead.email}</div>}
                    </td>
                    {/* Mobile Number */}
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {lead.phone}
                    </td>
                    {/* Company Name */}
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                      {lead.companyName || <span className="text-gray-400 italic">—</span>}
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
                          onClick={() => openEditModal(lead)}
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

      {/* Add/Edit Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {formData._id ? 'Edit Lead' : 'Add New Lead'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                  <input
                    type="text" required
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
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
                    type="email"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Agree">Agree (Interested)</option>
                    <option value="Reject">Reject</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                {user?.role === 'Admin' && (
                  <div>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white resize-none"
                    rows="3"
                  ></textarea>
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
    </div>
  );
};

export default Leads;
