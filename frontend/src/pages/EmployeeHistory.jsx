import React, { useState, useEffect } from 'react';
import { FiClock, FiTrash2, FiSearch, FiChevronDown, FiChevronUp, FiPhone, FiMail, FiUserCheck } from 'react-icons/fi';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const EmployeeHistory = () => {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchArchived();
  }, []);

  const fetchArchived = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users/history/archived');
      setArchived(data);
    } catch (err) {
      toast.error('Failed to load employee history');
    } finally {
      setLoading(false);
    }
  };

  const deleteArchived = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this archived employee and all their data? This action cannot be undone.')) return;
    try {
      await api.delete(`/users/history/archived/${id}`);
      setArchived(prev => prev.filter(emp => emp._id !== id));
      toast.success('Archived employee deleted forever');
    } catch (err) {
      toast.error('Failed to delete archived employee');
    }
  };

  const restoreArchived = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to restore this employee? They will be active and all their data will be restored to the Team dashboard.')) return;
    try {
      const res = await api.post(`/users/history/archived/${id}/restore`);
      setArchived(prev => prev.filter(emp => emp._id !== id));
      toast.success(res.data.message || 'Employee restored successfully');
      if (res.data.newPassword) {
        toast(`The password has been reset to: ${res.data.newPassword}`, { duration: 6000, icon: '🔑' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore employee');
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filtered = archived.filter(emp => 
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiClock className="text-primary" /> Employee History
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View previously removed employees and their performance data</p>
        </div>
        
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 dark:text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiClock className="text-gray-400 text-2xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No History Found</h3>
          <p className="text-gray-500 dark:text-gray-400">There are no removed employees in the history yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((emp) => (
            <div key={emp._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all">
              {/* Header / Summary */}
              <div 
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => toggleExpand(emp._id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-lg">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                      {emp.name} 
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600">Archived</span>
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="flex items-center gap-1"><FiMail /> {emp.email}</span>
                      <span className="flex items-center gap-1"><FiPhone /> {emp.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="grid grid-cols-2 md:flex gap-4 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Customers</p>
                      <p className="font-bold text-blue-700 dark:text-blue-300">{emp.stats?.totalCustomers || 0}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-800 text-center">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Converted</p>
                      <p className="font-bold text-green-700 dark:text-green-300">{emp.stats?.convertedLeads || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => restoreArchived(emp._id, e)}
                      className="text-gray-400 hover:text-green-500 transition-colors p-2 rounded-full hover:bg-green-50 dark:hover:bg-green-900/30"
                      title="Activate Employee"
                    >
                      <FiUserCheck size={18} />
                    </button>
                    <button 
                      onClick={(e) => deleteArchived(emp._id, e)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="Delete Forever"
                    >
                      <FiTrash2 size={18} />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2">
                      {expandedId === emp._id ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === emp._id && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-5">
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Detailed Statistics</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center shadow-sm">
                        <p className="text-xs text-gray-500">Pending</p>
                        <p className="font-bold text-gray-800 dark:text-white">{emp.stats?.pendingCustomers || 0}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center shadow-sm">
                        <p className="text-xs text-gray-500">Rejected</p>
                        <p className="font-bold text-gray-800 dark:text-white">{emp.stats?.rejectedCustomers || 0}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center shadow-sm">
                        <p className="text-xs text-gray-500">Others</p>
                        <p className="font-bold text-gray-800 dark:text-white">{emp.stats?.otherCustomers || 0}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center shadow-sm">
                        <p className="text-xs text-gray-500">Deleted On</p>
                        <p className="font-bold text-gray-800 dark:text-white text-sm">{new Date(emp.deletedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Customer Data Snapshot</h4>
                    {emp.customers && emp.customers.length > 0 ? (
                      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase text-xs">
                            <tr>
                              <th className="px-4 py-3 font-medium">Customer Name</th>
                              <th className="px-4 py-3 font-medium">Phone</th>
                              <th className="px-4 py-3 font-medium">Status</th>
                              <th className="px-4 py-3 font-medium">Task Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {emp.customers.map((c, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{c.name}</td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.phone}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                    c.status === 'Agree' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' :
                                    c.status === 'Reject' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400' :
                                    c.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300'
                                  }`}>
                                    {c.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.taskDate || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">No customers were assigned to this employee at the time of deletion.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeHistory;
