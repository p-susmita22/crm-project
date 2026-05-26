import React, { useState, useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { 
  FiHome, FiUsers, FiTarget, FiCheckSquare, FiSettings,
  FiLogOut, FiMenu, FiX, FiFileText, FiUser, FiChevronDown, FiEdit3
} from 'react-icons/fi';
import multimaartLogo from '../assets/multimaart-logo.png';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const DashboardLayout = ({ panelType = 'employee' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  
  const { user, logout, setUser } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext); // Keep theme context to retain light mode / dark mode class from root if needed, though removing toggle

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const location = useLocation();

  const basePath = panelType === 'admin' ? '/admin' : '/employee';

  const navItems = [
    { name: 'Dashboard', path: `${basePath}/dashboard`, icon: <FiHome className="text-xl" /> },
    { name: 'Customers', path: `${basePath}/customers`, icon: <FiUsers className="text-xl" /> },
    { name: 'Leads', path: `${basePath}/leads`, icon: <FiTarget className="text-xl" /> },
  ];

  if (panelType === 'employee') {
    navItems.push({ name: 'Tasks', path: `${basePath}/tasks`, icon: <FiCheckSquare className="text-xl" /> });
  }

  if (panelType === 'admin') {
    navItems.push({ name: 'Team', path: `${basePath}/team`, icon: <FiSettings className="text-xl" /> });
    navItems.push({ name: 'Reports', path: `${basePath}/reports`, icon: <FiFileText className="text-xl" /> });
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (panelType !== 'admin') return;

    setIsUpdatingProfile(true);
    try {
      const payload = {
        name: profileName,
        email: profileEmail,
      };
      if (profilePassword) {
        if (profilePassword.length < 6 || profilePassword.length > 8 || !/^[A-Z]/.test(profilePassword) || !/[^a-zA-Z0-9\s]/.test(profilePassword)) {
          toast.error('Password must be 6 to 8 characters, start with a capital letter, and contain a special character');
          setIsUpdatingProfile(false);
          return;
        }
        payload.password = profilePassword;
      }

      const { data } = await api.put(`/users/${user._id}`, payload);
      setUser(data);
      toast.success('Profile updated successfully!');
      setProfileModalOpen(false);
      setProfilePassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
      >
        <div className="flex items-center justify-between p-6 h-20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <img src={multimaartLogo} alt="Multimaart Logo" className="h-14 w-auto object-contain" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              CRM
            </h1>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <FiX className="text-2xl" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                location.pathname.startsWith(item.path)
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
          >
            <FiLogOut className="text-xl" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 mr-4"
            >
              <FiMenu className="text-2xl" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white capitalize">
              {location.pathname.split('/')[2] || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center space-x-4 relative">
            <div 
              className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700/50 py-1.5 px-3 rounded-full border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-sm">
                <p className="font-medium text-gray-700 dark:text-gray-200">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
              </div>
              <FiChevronDown className="text-gray-500" />
            </div>

            {/* Profile Dropdown */}
            {isProfileDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50 animate-fade-in">
                {panelType === 'admin' && (
                  <button 
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setProfileName(user?.name || '');
                      setProfileEmail(user?.email || '');
                      setProfilePassword('');
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <FiUser /> Profile
                  </button>
                )}
                <button 
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <FiLogOut /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-secondary/5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FiEdit3 className="text-primary" /> Edit Profile
              </h3>
              <button onClick={() => setProfileModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <FiX size={20} />
              </button>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                <input
                  type="text" required
                  value={profileName} onChange={e => setProfileName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                <input
                  type="email" required
                  value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank to keep current password"
                  value={profilePassword} onChange={e => setProfilePassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-bold transition-all disabled:opacity-70 mt-2"
              >
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
