import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { FiTarget, FiPlus, FiEdit2, FiCalendar, FiClock, FiBell, FiFileText, FiTag } from 'react-icons/fi';

const STATUS_OPTIONS = ['New', 'Contacted', 'Interested', 'Converted', 'Lost', 'Follow-up Pending'];

const statusColor = {
  'New': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Contacted': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Interested': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Converted': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Lost': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Follow-up Pending': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const LeadManagementSection = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState(null);
  const [form, setForm] = useState({ notes: '', followUpDate: '', callScheduledAt: '', reminder: '', status: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/leads')
      .then(r => { setLeads(r.data); if (r.data.length) openLead(r.data[0]); })
      .catch(() => toast.error('Failed to load leads'))
      .finally(() => setLoading(false));
  }, []);

  const openLead = (lead) => {
    setActiveLead(lead);
    setForm({
      notes: lead.notes || '',
      followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 10) : '',
      callScheduledAt: lead.callScheduledAt ? lead.callScheduledAt.slice(0, 16) : '',
      reminder: lead.reminder || '',
      status: lead.status || 'New',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/leads/${activeLead._id}`, form);
      setLeads(leads.map(l => l._id === data._id ? data : l));
      setActiveLead(data);
      toast.success('Lead updated!');
    } catch (error) {
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl"><FiTarget className="text-orange-500 text-lg" /></div>
        <div>
          <h2 className="font-bold text-gray-800 dark:text-white text-base leading-tight">Lead Management</h2>
          <p className="text-xs text-gray-400">Schedule calls, set reminders, track follow-ups</p>
        </div>
        <span className="ml-auto text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2.5 py-1 rounded-full font-semibold">
          {leads.length} Leads
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-700">
        {/* Lead List */}
        <div className="overflow-y-auto max-h-[420px]">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <FiTarget className="text-3xl opacity-30" />
              <p className="text-sm">No leads assigned yet.</p>
            </div>
          ) : (
            leads.map(lead => (
              <button
                key={lead._id}
                onClick={() => openLead(lead)}
                className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${activeLead?._id === lead._id ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {lead.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{lead.name}</p>
                  <p className="text-xs text-gray-400 truncate">{lead.phone}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor[lead.status] || statusColor['New']}`}>
                  {lead.status}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Lead Detail / Actions */}
        {activeLead ? (
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Lead Name</p>
              <p className="font-bold text-gray-800 dark:text-white">{activeLead.name}</p>
              <p className="text-sm text-gray-500">{activeLead.phone} {activeLead.email && `• ${activeLead.email}`}</p>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-2"><FiTag size={11} /> Lead Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Schedule Call */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-2"><FiClock size={11} /> Schedule Call</label>
              <input
                type="datetime-local"
                value={form.callScheduledAt}
                onChange={e => setForm({ ...form, callScheduledAt: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200"
              />
            </div>

            {/* Follow-up Date */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-2"><FiCalendar size={11} /> Follow-up Date</label>
              <input
                type="date"
                value={form.followUpDate}
                onChange={e => setForm({ ...form, followUpDate: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200"
              />
            </div>

            {/* Reminder */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-2"><FiBell size={11} /> Reminder / Task</label>
              <input
                type="text"
                placeholder="e.g. Call back after lunch, Send brochure…"
                value={form.reminder}
                onChange={e => setForm({ ...form, reminder: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-2"><FiFileText size={11} /> Notes</label>
              <textarea
                rows={3}
                placeholder="Add notes about this lead…"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200 resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            >
              <FiPlus /> {saving ? 'Saving…' : 'Save Lead Updates'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <FiEdit2 className="text-3xl opacity-30" />
            <p className="text-sm">Select a lead to manage.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadManagementSection;
