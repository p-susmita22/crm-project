import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import StatCard from '../components/StatCard';
import EmployeeCallingPanel from '../components/EmployeeCallingPanel';
import { FiUsers, FiTarget, FiTrendingUp, FiXCircle, FiBriefcase, FiDownload, FiBell, FiInbox } from 'react-icons/fi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const isEmployeePanel = location.pathname.startsWith('/employee');
  const [workSubmissions, setWorkSubmissions] = useState([]);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);

  useEffect(() => {
    // Only fetch dashboard stats for Admin view. 
    // Employees get their data in the EmployeeCallingPanel.
    if (isEmployeePanel) {
      setLoading(false);
      return;
    }

    const fetchDashboardStats = async () => {
      try {
        const { data } = await api.get('/dashboard');
        setStats(data);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    const fetchWorkSubmissions = async () => {
      try {
        const { data } = await api.get('/work-submissions');
        setWorkSubmissions(data);
      } catch (err) {
        console.error('Failed to load work submissions');
      }
    };

    fetchDashboardStats();
    fetchWorkSubmissions();
    const interval = setInterval(fetchWorkSubmissions, 30000);
    return () => clearInterval(interval);
  }, [user, isEmployeePanel]);

  const handleDownloadEmployeeExcel = async (submission) => {
    try {
      const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:5000';
      const fullUrl = `${baseUrl}${submission.fileUrl}`;
      
      const a = document.createElement('a');
      a.href = fullUrl;
      a.target = '_blank';
      a.download = submission.fileName || 'Work_Submission';
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      // Mark as read
      if (!submission.isRead) {
        await api.put(`/work-submissions/${submission._id}/read`);
        setWorkSubmissions(prev => prev.map(s => s._id === submission._id ? { ...s, isRead: true } : s));
      }
    } catch (error) {
      toast.error('Failed to download Excel');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isEmployeePanel) {
    return <EmployeeCallingPanel />;
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const customerData = stats?.customerStatusData?.map(item => ({
    name: item._id,
    value: item.count
  })) || [];

  const leadData = stats?.leadStatusData?.map(item => ({
    name: item._id,
    value: item.count
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'Admin' && (
            <button 
              onClick={() => setShowSubmissionsModal(true)}
              className="relative flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-xl font-bold transition-all"
            >
              <FiInbox size={18} /> Received Work
              {workSubmissions.filter(s => !s.isRead).length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full animate-pulse shadow-md">
                  {workSubmissions.filter(s => !s.isRead).length}
                </span>
              )}
            </button>
          )}
          <div className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Customers" 
          value={stats?.totalCustomers || 0} 
          icon={<FiUsers className="text-2xl" />} 
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          trend={12}
          onClick={() => navigate('/admin/customers')}
        />
        <StatCard 
          title="Total Employees" 
          value={stats?.totalEmployees || 0} 
          icon={<FiBriefcase className="text-2xl" />} 
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          trend={8}
          onClick={() => navigate('/admin/team')}
        />
        <StatCard 
          title="Converted Leads" 
          value={stats?.convertedLeads || 0} 
          icon={<FiTrendingUp className="text-2xl" />} 
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          trend={24}
          onClick={() => navigate('/admin/leads')}
        />
        <StatCard 
          title="Rejected Customers" 
          value={stats?.rejectedCustomers || 0} 
          icon={<FiXCircle className="text-2xl" />} 
          color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          trend={-5}
          onClick={() => navigate('/admin/customers')}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Customer Status Distribution</h3>
          <div className="h-72 min-h-0">
            {customerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {customerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Lead Status Overview</h3>
          <div className="h-72 min-h-0">
            {leadData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {leadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Admin specific: Employee Performance */}
      {user?.role === 'Admin' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Employee Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Customers</th>
                  <th className="py-3 px-4">Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats?.employeePerformance?.map((emp) => (
                  <tr key={emp._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-gray-200">{emp.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{emp.customerCount}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{emp.leadCount}</td>
                  </tr>
                ))}
                {(!stats?.employeePerformance || stats.employeePerformance.length === 0) && (
                  <tr>
                    <td colSpan="3" className="py-4 text-center text-sm text-gray-500">No employee data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Received Work Modal */}
      {showSubmissionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FiInbox className="text-purple-500" /> Employee Daily Work Submissions
              </h3>
              <button onClick={() => setShowSubmissionsModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <FiXCircle size={22} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {workSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No work submissions received yet.</div>
              ) : (
                workSubmissions.map(sub => (
                  <div key={sub._id} className={`flex items-center justify-between p-4 rounded-xl border ${sub.isRead ? 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700' : 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'}`}>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {sub.employeeName} 
                        {!sub.isRead && <span className="bg-red-500 text-white text-[10px] uppercase px-2 py-0.5 rounded-full font-bold">New</span>}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Submitted: {new Date(sub.createdAt).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => handleDownloadEmployeeExcel(sub)}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-bold transition-colors"
                    >
                      <FiDownload size={14} /> View File
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
