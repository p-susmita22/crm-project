import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { FiFileText, FiDownload, FiCalendar, FiChevronDown, FiChevronUp, FiTrash2, FiClock, FiEye, FiSearch } from 'react-icons/fi';

const formatTime = (sec = 0) => {
  if (!sec || sec <= 0) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const Reports = () => {
  const [employees, setEmployees] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, repRes] = await Promise.all([
        api.get('/users/status'),
        api.get('/reports') // Fetches all submitted reports
      ]);
      setEmployees(empRes.data);
      setAllReports(repRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleHistory = (empId) => {
    if (expandedEmployee === empId) {
      setExpandedEmployee(null);
    } else {
      setExpandedEmployee(empId);
    }
  };

  const deleteReport = async (reportId) => {
    if (!window.confirm('Delete this report permanently?')) return;
    try {
      await api.delete(`/reports/${reportId}`);
      setAllReports(prev => prev.filter(r => r._id !== reportId));
      toast.success('Report deleted');
    } catch (error) {
      toast.error('Failed to delete report');
    }
  };

  const viewReport = (r) => {
    const dateStr = new Date(r.submittedAt).toLocaleDateString('en-IN');
    const sessionTime = formatTime(r.sessionTimeSeconds || 0);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Daily Report - ${r.employeeName} - ${r.reportDate}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Outfit', sans-serif; padding: 36px; color: #1f2937; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 28px; }
            .title { font-size: 24px; font-weight: 800; color: #312e81; letter-spacing: -0.02em; }
            .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
            .meta { font-size: 12px; color: #6b7280; text-align: right; }
            .meta b { color: #374151; display: block; font-size: 13px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
            .card { border-radius: 14px; padding: 16px; }
            .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; opacity: 0.6; margin-bottom: 6px; }
            .card-value { font-size: 26px; font-weight: 800; }
            .blue { background: #eff6ff; color: #1d4ed8; }
            .green { background: #f0fdf4; color: #15803d; }
            .red { background: #fef2f2; color: #b91c1c; }
            .orange { background: #fff7ed; color: #c2410c; }
            .purple { background: #faf5ff; color: #7e22ce; }
            .teal { background: #f0fdfa; color: #0f766e; }
            .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
            .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9ca3af; margin-bottom: 8px; }
            .notes-text { font-size: 13px; color: #374151; line-height: 1.6; white-space: pre-line; }
            .footer { margin-top: 28px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">📋 Daily Work Report</div>
              <div class="subtitle">Submitted by ${r.employeeName} &nbsp;·&nbsp; ${r.reportDate}</div>
            </div>
            <div class="meta">
              <b>Generated: ${dateStr}</b>
              Submitted at: ${new Date(r.submittedAt).toLocaleTimeString()}
            </div>
          </div>

          <div class="grid">
            <div class="card blue"><div class="card-label">Calls Assigned</div><div class="card-value">${r.totalCallsAssigned}</div></div>
            <div class="card purple"><div class="card-label">Calls Done</div><div class="card-value">${r.callsDone}</div></div>
            <div class="card orange"><div class="card-label">Leads Generated</div><div class="card-value">${r.leadsGenerated}</div></div>
            <div class="card green"><div class="card-label">Interested / Agreed</div><div class="card-value">${r.positiveResponses}</div></div>
            <div class="card red"><div class="card-label">Rejected</div><div class="card-value">${r.negativeResponses}</div></div>
            <div class="card teal"><div class="card-label">Session Time</div><div class="card-value" style="font-size:18px;">${sessionTime}</div></div>
          </div>

          ${r.additionalNotes ? `
            <div class="notes-box">
              <div class="notes-label">Additional Notes / Remarks</div>
              <div class="notes-text">${r.additionalNotes}</div>
            </div>
          ` : ''}

          <div class="footer">CRM System &mdash; Employee Daily Report &mdash; Confidential &mdash; ${dateStr}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadReportPdf = (r) => {
    const dateStr = new Date(r.submittedAt).toLocaleDateString('en-IN');
    const sessionTime = formatTime(r.sessionTimeSeconds || 0);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Daily Report - ${r.employeeName} - ${r.reportDate}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Outfit', sans-serif; padding: 36px; color: #1f2937; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 28px; }
            .title { font-size: 24px; font-weight: 800; color: #312e81; letter-spacing: -0.02em; }
            .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
            .meta { font-size: 12px; color: #6b7280; text-align: right; }
            .meta b { color: #374151; display: block; font-size: 13px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
            .card { border-radius: 14px; padding: 16px; border: 1px solid #e5e7eb; }
            .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #6b7280; margin-bottom: 6px; }
            .card-value { font-size: 26px; font-weight: 800; color: #111827; }
            .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
            .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9ca3af; margin-bottom: 8px; }
            .notes-text { font-size: 13px; color: #374151; line-height: 1.6; white-space: pre-line; }
            .footer { margin-top: 28px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 14px; }
            
            /* Print Specific Styles */
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .card { border: 2px solid #e5e7eb !important; break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">📋 Daily Work Report</div>
              <div class="subtitle">Submitted by ${r.employeeName} &nbsp;·&nbsp; ${r.reportDate}</div>
            </div>
            <div class="meta">
              <b>Generated: ${dateStr}</b>
              Submitted at: ${new Date(r.submittedAt).toLocaleTimeString()}
            </div>
          </div>

          <div class="grid">
            <div class="card"><div class="card-label">Calls Assigned</div><div class="card-value">${r.totalCallsAssigned}</div></div>
            <div class="card"><div class="card-label">Calls Done</div><div class="card-value">${r.callsDone}</div></div>
            <div class="card"><div class="card-label">Leads Generated</div><div class="card-value">${r.leadsGenerated}</div></div>
            <div class="card"><div class="card-label">Interested / Agreed</div><div class="card-value">${r.positiveResponses}</div></div>
            <div class="card"><div class="card-label">Rejected</div><div class="card-value">${r.negativeResponses}</div></div>
            <div class="card"><div class="card-label">Session Time</div><div class="card-value" style="font-size:18px;">${sessionTime}</div></div>
          </div>

          ${r.additionalNotes ? `
            <div class="notes-box">
              <div class="notes-label">Additional Notes / Remarks</div>
              <div class="notes-text">${r.additionalNotes}</div>
            </div>
          ` : ''}

          <div class="footer">CRM System &mdash; Employee Daily Report &mdash; Confidential &mdash; ${dateStr}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for fonts/styles to load before triggering print
    setTimeout(() => {
      printWindow.print();
      // Optional: printWindow.close(); 
      // Most users prefer closing it themselves or we can auto-close after print dialog closes.
    }, 300);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiFileText className="text-primary" /> Employee Reports
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View submitted reports and download daily task Excel sheets.</p>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 dark:text-white shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="py-4 px-5">Employee</th>
                <th className="py-4 px-5">Email ID</th>
                <th className="py-4 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="3" className="py-10 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </td>
                </tr>
              ) : (
                (() => {
                  const filteredEmployees = employees.filter(emp =>
                    emp.name?.toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  if (filteredEmployees.length === 0) {
                    return (
                      <tr>
                        <td colSpan="3" className="py-10 text-center text-gray-400">No employees match your search.</td>
                      </tr>
                    );
                  }

                  return filteredEmployees.map((emp) => {
                    const empReports = allReports.filter(r => 
                      r.employee === emp._id || (r.employee && r.employee._id === emp._id)
                    );
                  
                  return (
                    <React.Fragment key={emp._id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-sm">
                              {emp.name?.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{emp.name}</p>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-sm text-gray-600 dark:text-gray-400">{emp.email}</td>
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => toggleHistory(emp._id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                              expandedEmployee === emp._id
                                ? 'bg-primary text-white border-primary'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary'
                            }`}
                          >
                            <FiCalendar /> {expandedEmployee === emp._id ? 'Close History' : `View Reports (${empReports.length})`}
                            {expandedEmployee === emp._id ? <FiChevronUp /> : <FiChevronDown />}
                          </button>
                        </td>
                      </tr>
                      
                      {/* ── Date-wise Submitted Reports Expandable Row ── */}
                      {expandedEmployee === emp._id && (
                        <tr>
                          <td colSpan="3" className="bg-gray-50 dark:bg-gray-900/40 px-5 py-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">📋 Submitted Reports — {emp.name}</p>
                            {empReports.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
                                  <thead>
                                    <tr className="text-xs font-semibold text-gray-400 uppercase bg-gray-100 dark:bg-gray-700/50">
                                      <th className="text-left py-3 px-4">Date</th>
                                      <th className="text-center py-3 px-3">Assigned</th>
                                      <th className="text-center py-3 px-3">Done</th>
                                      <th className="text-center py-3 px-3 text-orange-500">Leads</th>
                                      <th className="text-center py-3 px-3 text-green-600">Agreed</th>
                                      <th className="text-center py-3 px-3 text-red-500">Rejected</th>
                                      <th className="text-center py-3 px-3">Session</th>
                                      <th className="text-center py-3 px-3">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {empReports.map(row => (
                                      <tr key={row._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 border-l-4 border-primary flex items-center justify-between">
                                          <span>{new Date(row.reportDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                          <button onClick={() => deleteReport(row._id)} className="text-gray-400 hover:text-red-500" title="Delete Report"><FiTrash2 size={13}/></button>
                                        </td>
                                        <td className="py-3 px-3 text-center font-bold text-blue-600 dark:text-blue-400">{row.totalCallsAssigned}</td>
                                        <td className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{row.callsDone}</td>
                                        <td className="py-3 px-3 text-center text-orange-500 font-semibold">{row.leadsGenerated}</td>
                                        <td className="py-3 px-3 text-center text-green-600 font-semibold">{row.positiveResponses}</td>
                                        <td className="py-3 px-3 text-center text-red-500 font-semibold">{row.negativeResponses}</td>
                                        <td className="py-3 px-3 text-center">
                                          <span className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-300">
                                            <FiClock size={12} className="text-teal-500" /> {formatTime(row.sessionTimeSeconds)}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              onClick={() => viewReport(row)}
                                              className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                              title="View Full Report"
                                            >
                                              <FiEye size={14} />
                                            </button>
                                            <button
                                              onClick={() => downloadReportPdf(row)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                            >
                                              <FiDownload size={14} /> PDF
                                            </button>
                                            <button
                                              onClick={() => downloadEmployeeExcel(emp._id, `${emp.name}_${row.reportDate}`, row.reportDate)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                            >
                                              <FiDownload size={14} /> Excel
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 text-center py-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">No submitted reports found for this employee.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
