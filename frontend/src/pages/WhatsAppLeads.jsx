import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { FiMessageCircle, FiSearch, FiDownload, FiFilter, FiX } from 'react-icons/fi';

const INTEREST_OPTIONS = ['All', 'Seller', 'District Partner', 'Profile Inquiry'];

const WhatsAppLeads = () => {
  const { user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [interestFilter, setInterestFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    try {
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getLeadDate = (lead) =>
    new Date(lead.taskDate || lead.updatedAt || lead.createdAt);

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.phone || '').includes(searchTerm);

    const matchesInterest =
      interestFilter === 'All' || l.onboarding === interestFilter;

    const leadDate = getLeadDate(l);
    const matchesFrom = dateFrom ? leadDate >= new Date(dateFrom) : true;
    const matchesTo = dateTo
      ? leadDate <= new Date(new Date(dateTo).setHours(23, 59, 59, 999))
      : true;

    return matchesSearch && matchesInterest && matchesFrom && matchesTo;
  });

  const clearFilters = () => {
    setInterestFilter('All');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  const isFiltered =
    interestFilter !== 'All' || dateFrom || dateTo || searchTerm;

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Contacted': return 'bg-yellow-100 text-yellow-800';
      case 'Interested':
      case 'Agree': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Reject':
      case 'Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExportExcel = () => {
    if (filteredLeads.length === 0) {
      toast.error('No data to export!');
      return;
    }

    const dataToExport = filteredLeads.map((lead) => ({
      Date: getLeadDate(lead).toLocaleDateString('en-GB'),
      'Customer Name': lead.name || '',
      'Mobile Number': lead.phone || '',
      'Selected Interest': lead.onboarding || '',
      Status: lead.status === 'Agree' ? 'Interested' : lead.status === 'Reject' ? 'Rejected' : lead.status,
      Remarks: lead.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 16 },
      { wch: 20 }, { wch: 15 }, { wch: 40 },
    ];
    const workbook = XLSX.utils.book_new();

    // Sheet name reflects active filters
    let sheetLabel = interestFilter !== 'All' ? interestFilter.replace(' ', '_') : 'All';
    if (dateFrom || dateTo) sheetLabel += `_${dateFrom || ''}_to_${dateTo || ''}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WA_Leads');

    const d = new Date();
    const dateStr = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    const filterStr = interestFilter !== 'All' ? `_${interestFilter.replace(/ /g, '_')}` : '';
    const dateRangeStr = dateFrom ? `_${dateFrom}_to_${dateTo || 'today'}` : '';

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WhatsApp_Leads${filterStr}${dateRangeStr}_${dateStr}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLeads.length} leads!`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            <FiMessageCircle className="mr-2 text-green-500" /> WhatsApp Recent Leads
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Real-time leads automatically captured from your WhatsApp bot
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-sm dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400 whitespace-nowrap"
        >
          <FiDownload className="mr-2" />
          Download Excel
          {isFiltered && (
            <span className="ml-2 bg-emerald-200 dark:bg-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs px-1.5 py-0.5 rounded-full">
              Filtered
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
          <FiFilter size={14} /> Filters
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <FiX size={12} /> Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" size={14} />
            </div>
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
            />
          </div>

          {/* Interest Type Filter */}
          <select
            value={interestFilter}
            onChange={(e) => setInterestFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          >
            {INTEREST_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === 'All' ? '🔍 All Interest Types' : opt}</option>
            ))}
          </select>

          {/* Date From */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 ml-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 ml-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom}
              className="block w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
            />
          </div>
        </div>

        {/* Active filter summary */}
        {isFiltered && (
          <div className="flex flex-wrap gap-2 pt-1">
            {interestFilter !== 'All' && (
              <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                Interest: {interestFilter}
                <button onClick={() => setInterestFilter('All')}><FiX size={10} /></button>
              </span>
            )}
            {dateFrom && (
              <span className="bg-purple-50 text-purple-700 border border-purple-100 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                From: {new Date(dateFrom).toLocaleDateString('en-GB')}
                <button onClick={() => setDateFrom('')}><FiX size={10} /></button>
              </span>
            )}
            {dateTo && (
              <span className="bg-purple-50 text-purple-700 border border-purple-100 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                To: {new Date(dateTo).toLocaleDateString('en-GB')}
                <button onClick={() => setDateTo('')}><FiX size={10} /></button>
              </span>
            )}
            <span className="text-xs text-gray-500 self-center">
              Showing {filteredLeads.length} of {leads.length} leads
            </span>
          </div>
        )}
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
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  </td>
                </tr>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {getLeadDate(lead).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{lead.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{lead.phone}</div>
                    </td>
                    <td className="py-4 px-6">
                      {lead.onboarding ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          lead.onboarding === 'Seller'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : lead.onboarding === 'District Partner'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-purple-50 text-purple-700 border-purple-100'
                        }`}>
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
                    {isFiltered ? (
                      <>No leads match your filters. <button onClick={clearFilters} className="text-green-500 underline">Clear filters</button></>
                    ) : (
                      <>No leads captured from WhatsApp yet.<br /><span className="text-xs">Once your bot is running, leads will automatically appear here.</span></>
                    )}
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
