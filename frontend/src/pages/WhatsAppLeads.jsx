import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { FiMessageCircle, FiSearch, FiDownload } from 'react-icons/fi';

const WhatsAppLeads = () => {
  const { user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      // Fetch only leads generated via WhatsApp API
      const response = await api.get('/customers?file=WhatsApp API');
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to load WhatsApp leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 30 seconds to show new leads
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredLeads = leads.filter(l => {
    const matchesSearch = (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (l.phone || '').includes(searchTerm);
    return matchesSearch;
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
      'Onboarding Type': lead.onboarding || '',
      'Status': lead.status === 'Agree' ? 'Interested' : lead.status === 'Reject' ? 'Rejected' : lead.status,
      'Remarks': lead.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 40 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WhatsApp Leads');
    
    const d = new Date();
    const dateString = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WhatsApp_Leads_${dateString}.xlsx`;
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
            <FiMessageCircle className="mr-2 text-green-500" /> WhatsApp Recent Leads
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time leads automatically captured from your WhatsApp bot
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-sm dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400"
          >
            <FiDownload className="mr-2" /> Download Excel
          </button>
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
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-all"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Customer Info</th>
                <th className="py-4 px-6">Selected Interest</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </td>
                </tr>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {lead.taskDate ? new Date(lead.taskDate).toLocaleDateString('en-GB') : new Date(lead.updatedAt || lead.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{lead.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{lead.phone}</div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                      {lead.onboarding ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                          {lead.onboarding}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {lead.notes || 'Captured via WhatsApp Auto-reply'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">
                    No leads captured from WhatsApp yet. 
                    <br/><span className="text-xs">Once your ads are running, leads will automatically appear here.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppLeads;
