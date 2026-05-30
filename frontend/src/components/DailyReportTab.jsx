import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  FiFileText, FiSend, FiCheckCircle, FiPhone, FiTrendingUp,
  FiThumbsUp, FiThumbsDown, FiUser, FiCalendar, FiAlertCircle, FiList, FiClock
} from 'react-icons/fi';

const formatTime = (totalSeconds = 0) => {
  if (!totalSeconds || totalSeconds <= 0) return '0h 0m 0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const today = () => new Date().toISOString().slice(0, 10);

const StatBox = ({ icon, label, value, color }) => (
  <div className={`flex items-center gap-3 p-4 rounded-xl ${color}`}>
    <div className="text-2xl">{icon}</div>
    <div>
      <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const DailyReportTab = ({ customers, sessionSeconds = 0, assignedCallsCount = 0 }) => {
  const { user } = useContext(AuthContext);
  const [pastReports, setPastReports] = useState([]);
  const [todayReport, setTodayReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculated from customers prop and assigned count
  const totalCallsAssigned = assignedCallsCount;
  const callsDone = customers.filter(c => c.status !== 'Pending').length;
  const positiveResponses = customers.filter(c => c.status === 'Agree').length;
  const negativeResponses = customers.filter(c => c.status === 'Reject').length;

  const [form, setForm] = useState({
    leadsGenerated: '',
    additionalNotes: '',
  });

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await api.get('/reports/mine');
        setPastReports(data);
        const existing = data.find(r => r.reportDate === today());
        if (existing) setTodayReport(existing);
      } catch (error) {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leadsGenerated && form.leadsGenerated !== 0) {
      toast.error('Please enter leads generated count');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/reports', {
        reportDate: today(),
        totalCallsAssigned: assignedCallsCount,
        callsDone,
        leadsGenerated: parseInt(form.leadsGenerated) || 0,
        positiveResponses,
        negativeResponses,
        additionalNotes: form.additionalNotes,
        sessionTimeSeconds: sessionSeconds,
      });
      setTodayReport(data);
      setPastReports(prev => [data, ...prev]);
      toast.success('Daily report submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Today's Report ────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <FiFileText className="text-primary text-lg" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white text-base">Daily Work Report</h2>
            <p className="text-xs text-gray-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          {todayReport && (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5 rounded-full">
              <FiCheckCircle size={12} /> Submitted
            </span>
          )}
        </div>

        <div className="p-6">
          {todayReport ? (
            // ── Submitted View (Read-only) ──────────────────
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                <FiCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400 text-sm">Report submitted successfully</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                    Submitted at {new Date(todayReport.submittedAt).toLocaleTimeString()}. You cannot edit or delete this report.
                  </p>
                </div>
              </div>

              {/* Report details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatBox icon={<FiUser className="text-purple-500" />}      label="Employee"           value={todayReport.employeeName}      color="bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-300" />
                <StatBox icon={<FiPhone className="text-blue-500" />}        label="Calls Assigned"    value={todayReport.totalCallsAssigned} color="bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300" />
                <StatBox icon={<FiCheckCircle className="text-indigo-500" />} label="Calls Done"        value={todayReport.callsDone}          color="bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300" />
                <StatBox icon={<FiTrendingUp className="text-orange-500" />} label="Leads Generated"   value={todayReport.leadsGenerated}     color="bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-300" />
                <StatBox icon={<FiThumbsUp className="text-green-500" />}    label="Positive / Agreed" value={todayReport.positiveResponses}   color="bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300" />
                <StatBox icon={<FiThumbsDown className="text-red-500" />}    label="Rejected"          value={todayReport.negativeResponses}   color="bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300" />
                <StatBox icon={<FiClock className="text-teal-500" />}        label="Session Time"      value={formatTime(todayReport.sessionTimeSeconds)} color="bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-300" />
              </div>

              {todayReport.additionalNotes && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Additional Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{todayReport.additionalNotes}</p>
                </div>
              )}
            </div>
          ) : (
            // ── Submit Form ─────────────────────────────────
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <FiAlertCircle className="text-yellow-500 mt-0.5 flex-shrink-0" size={18} />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Once submitted, the report <strong>cannot be modified or deleted</strong> by you. Please double-check before submitting.
                </p>
              </div>

              {/* Auto-filled stats */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Auto-Filled from Today's Activity</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatBox icon={<FiUser className="text-purple-500" />}       label="Your Name"      value={user?.name}            color="bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-300" />
                  <StatBox icon={<FiPhone className="text-blue-500" />}        label="Calls Assigned" value={totalCallsAssigned}    color="bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300" />
                  <StatBox icon={<FiThumbsUp className="text-green-500" />}    label="Agreed"         value={positiveResponses}     color="bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300" />
                  <StatBox icon={<FiThumbsDown className="text-red-500" />}    label="Rejected"       value={negativeResponses}     color="bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300" />
                  <StatBox icon={<FiClock className="text-teal-500" />}        label="Session Time"   value={formatTime(sessionSeconds)} color="bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-300" />
                </div>
              </div>

              {/* Manual inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Calls Done Today <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number" readOnly value={callsDone}
                    className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-calculated from customers marked Done/Agree/Reject</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Leads Generated <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number" min="0" required
                    value={form.leadsGenerated}
                    onChange={e => setForm({ ...form, leadsGenerated: e.target.value })}
                    placeholder="e.g. 5"
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Notes / Remarks</label>
                <textarea
                  rows={4} value={form.additionalNotes}
                  onChange={e => setForm({ ...form, additionalNotes: e.target.value })}
                  placeholder="Any challenges faced today, important feedback from customers, follow-up actions needed…"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 resize-none"
                />
              </div>

              <button
                type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 shadow-md shadow-primary/20"
              >
                <FiSend size={16} />
                {submitting ? 'Submitting…' : 'Submit Daily Report'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Past Reports ─────────────────────────────────── */}
      {pastReports.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <FiList className="text-gray-500" />
            <h3 className="font-bold text-gray-700 dark:text-gray-300">Past Reports</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pastReports.map(r => (
              <div key={r._id} className="px-6 py-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-gray-400" size={14} />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{r.reportDate}</span>
                </div>
                <span className="text-xs text-gray-400">Assigned: <b>{r.totalCallsAssigned}</b></span>
                <span className="text-xs text-gray-400">Done: <b>{r.callsDone}</b></span>
                <span className="text-xs text-green-600">✅ Agreed: <b>{r.positiveResponses}</b></span>
                <span className="text-xs text-red-500">❌ Rejected: <b>{r.negativeResponses}</b></span>
                <span className="text-xs text-orange-500">🎯 Leads: <b>{r.leadsGenerated}</b></span>
                {r.sessionTimeSeconds > 0 && (
                  <span className="text-xs text-teal-600">⏱ Session: <b>{formatTime(r.sessionTimeSeconds)}</b></span>
                )}
                <span className="ml-auto text-xs text-gray-400">{new Date(r.submittedAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReportTab;
