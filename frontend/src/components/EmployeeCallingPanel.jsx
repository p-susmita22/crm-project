import React, { useState, useEffect, useRef, useContext } from 'react';
// Force HMR reload
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import CustomerDetailsSection from './CustomerDetailsSection';
import CallingScriptSection from './CallingScriptSection';
import LeadManagementSection from './LeadManagementSection';
import DailyReportTab from './DailyReportTab';
import { FiPhone, FiTarget, FiSun, FiWifi, FiWifiOff, FiClock, FiFileText } from 'react-icons/fi';

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const TABS = [
  { id: 'call',    label: 'Call Panel',      icon: FiPhone    },
  { id: 'leads',   label: 'Lead Management', icon: FiTarget   },
  { id: 'report',  label: 'Daily Report',    icon: FiFileText },
];

const EmployeeCallingPanel = () => {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('call');
  const [customers, setCustomers] = useState([]);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [totalCustomersCount, setTotalCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Timer ───────────────────────────────────────────────────────────────────
  const SESSION_KEY = 'crm_session_start';

  // Lazy init: calculate elapsed from localStorage immediately (no flicker to 00:00)
  const [elapsed, setElapsed] = useState(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      return Math.floor((Date.now() - parseInt(stored, 10)) / 1000);
    }
    return 0;
  });

  const [isOnline, setIsOnline] = useState(false);
  const tickRef = useRef(null);
  const sinceLastHeartbeat = useRef(0);

  useEffect(() => {
    // Ensure localStorage has the session start time
    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, Date.now().toString());
    }

    const sessionStartTime = parseInt(localStorage.getItem(SESSION_KEY), 10);
    setIsOnline(true);

    // Tell backend we're online
    api.post('/users/session/start').catch(() => {});

    // Tick every second using wall-clock (accurate across refreshes)
    tickRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - sessionStartTime) / 1000);
      setElapsed(secs);
      sinceLastHeartbeat.current += 1;

      if (sinceLastHeartbeat.current >= 30) {
        sinceLastHeartbeat.current = 0;
        api.post('/users/session/heartbeat', { elapsedSeconds: 30 }).catch(() => {});
      }
    }, 1000);

    // Cleanup on unmount (navigating away or logout)
    return () => {
      clearInterval(tickRef.current);
      api.post('/users/session/end', { elapsedSeconds: sinceLastHeartbeat.current }).catch(() => {});
    };
  }, []);

  // On browser tab close — mark offline but keep localStorage (so refresh restores timer)
  useEffect(() => {
    const handler = () => {
      api.post('/users/session/end', { elapsedSeconds: sinceLastHeartbeat.current }).catch(() => {});
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    api.get('/customers')
      .then(r => {
        setTotalCustomersCount(r.data.length);
        const todayDateStr = new Date().toISOString().slice(0, 10);
        
        // Find the most recent date with assigned customers
        const allDates = [...new Set(r.data.map(c => c.taskDate).filter(Boolean))].sort((a, b) => b.localeCompare(a));
        let targetDateStr = todayDateStr;
        
        // If today has no data, but past data exists, use the most recent past data
        if (allDates.length > 0 && !allDates.includes(todayDateStr)) {
          targetDateStr = allDates[0];
        }

        const targetCustomers = r.data.filter(c => c.taskDate === targetDateStr || (!c.taskDate && c.createdAt?.startsWith(targetDateStr)));
        setCustomers(targetCustomers);
        if (targetCustomers.length > 0) setActiveCustomer(targetCustomers[0]);
      })
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  }, []);

  const handleCustomerUpdated = (updated) => {
    setActiveCustomer(updated);
    setCustomers(prev => {
      const exists = prev.some(c => c._id === updated._id);
      if (exists) {
        return prev.map(c => c._id === updated._id ? updated : c);
      } else {
        return [...prev, updated];
      }
    });
  };

  const completedCalls  = customers.filter(c => c.status !== 'Pending').length;
  const interestedCount = customers.filter(c => c.status === 'Agree').length;
  const rejectedCount   = customers.filter(c => c.status === 'Reject').length;

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayAssignedCount = customers.filter(c => c.taskDate === todayDateStr).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-lg">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiSun className="text-yellow-400" /> Good day, {user?.name?.split(' ')[0]}!
            </h2>
            <p className="text-xs text-gray-400">Employee Calling Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* ── Live Session Timer ── */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2 shadow-sm">
            <FiClock className={`text-lg ${isOnline ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs text-gray-400 leading-none">Session Time</p>
              <p className="text-base font-mono font-bold text-gray-800 dark:text-white tracking-widest">
                {formatTime(elapsed)}
              </p>
            </div>
          </div>

          {/* ── Online/Offline badge ── */}
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${isOnline
            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
            : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'}`}
          >
            {isOnline ? <FiWifi /> : <FiWifiOff />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {/* ── Quick stats ── */}
          <div className="text-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2 shadow-sm" title="Today's calls assigned from Excel">
            <p className="text-xs text-gray-400">Assigned Calls (Today)</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{todayAssignedCount > 0 ? todayAssignedCount : (user?.assignedCallsCount || 0)}</p>
          </div>
          <div className="text-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-2 shadow-sm" title="Total customers assigned across all days">
            <p className="text-xs text-gray-400">Total Calling List</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{totalCustomersCount}</p>
          </div>
          <div className="text-center bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-700 rounded-xl px-4 py-2">
            <p className="text-xs text-green-600">Interested</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">{interestedCount}</p>
          </div>
          <div className="text-center bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-700 rounded-xl px-4 py-2">
            <p className="text-xs text-red-500">Rejected</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{rejectedCount}</p>
          </div>
          <div className="text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700 rounded-xl px-4 py-2">
            <p className="text-xs text-blue-500">Completed</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{completedCalls}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id
                ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      {tab === 'call' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5" style={{ minHeight: 'calc(100vh - 280px)' }}>
          <CustomerDetailsSection
            customer={activeCustomer}
            customers={customers}
            onSelectCustomer={setActiveCustomer}
            onCustomerUpdated={handleCustomerUpdated}
          />
          <CallingScriptSection customer={activeCustomer} />
        </div>
      )}

      {tab === 'leads' && <LeadManagementSection />}

      {tab === 'report' && <DailyReportTab 
        customers={customers} 
        sessionSeconds={elapsed} 
        assignedCallsCount={todayAssignedCount > 0 ? todayAssignedCount : (user?.assignedCallsCount || 0)}
      />}
    </div>
  );
};

export default EmployeeCallingPanel;
