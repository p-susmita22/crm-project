import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { FiMessageCircle, FiSearch, FiDownload, FiFilter, FiX, FiTrash2 } from 'react-icons/fi';

const INTEREST_OPTIONS = ['All', 'Seller', 'District Partner', 'Profile Inquiry'];

const WhatsAppLeads = () => {
  const { user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [interestFilter, setInterestFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

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

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l) => l._id));
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!window.confirm('Is lead ko delete karna chahte hain?')) return;
    try {
      await api.delete(`/customers/${id}`);
      setLeads((prev) => prev.filter((l) => l._id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Lead deleted!');
    } catch (err) {
      toast.error('Delete failed!');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`${selectedIds.length} leads delete karna chahte hain?`)) return;
    setDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`/customers/${id}`)));
      setLeads((prev) => prev.filter((l) => !selectedIds.includes(l._id)));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} leads deleted!`);
    } catch (err) {
      toast.error('Some deletes failed!');
    } finally {
      setDeleting(false);
    }
  };

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
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-sm disabled:opacity-50"
            >
              <FiTrash2 className="mr-2" />
              {deleting ? 'Deleting...' : `Delete (${selectedIds.length})`}
            </button>
          )}
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
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Icon Label */}
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
            <FiFilter size={13} /> Filters
          </span>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" size={13} />
            </div>
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm h-9"
            />
          </div>

          {/* Interest Type Filter */}
          <select
            value={interestFilter}
            onChange={(e) => setInterestFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm h-9 min-w-[170px]"
          >
            {INTEREST_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === 'All' ? 'All Interest Types' : opt}</option>
            ))}
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From Date"
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm h-9"
          />

          {/* Separator */}
          <span className="text-gray-400 text-sm">→</span>

          {/* Date To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom}
            title="To Date"
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm h-9"
          />

          {/* Clear Button */}
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors h-9 whitespace-nowrap"
            >
              <FiX size={12} /> Clear
            </button>
          )}

          {/* Count badge */}
          {isFiltered && (
            <span className="text-xs text-gray-400 ml-1">
              {filteredLeads.length}/{leads.length} leads
            </span>
          )}
        </div>
      </div>


      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="py-4 px-4">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-400 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4">Date</th>
                <th className="py-4 px-6">Customer Info</th>
                <th className="py-4 px-6">Selected Interest</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Remarks</th>
                <th className="py-4 px-4">Action</th>
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
                  <tr
                    key={lead._id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                      selectedIds.includes(lead._id) ? 'bg-red-50/40 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(lead._id)}
                        onChange={() => toggleSelect(lead._id)}
                        className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-400 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
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
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleDeleteSingle(lead._id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete this lead"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500 dark:text-gray-400">
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
