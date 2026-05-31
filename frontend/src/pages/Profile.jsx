import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiLock, FiMonitor, FiTrash2, FiSave, FiShield } from 'react-icons/fi';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/users/profile');
      setProfile(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || ''
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    setIsSavingDetails(true);
    try {
      const { data } = await api.put('/users/profile', formData);
      toast.success('Profile updated successfully!');
      setUser({ ...user, ...data });
      fetchProfile();
      setIsEditingProfile(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (
      passwordData.newPassword.length < 6 ||
      passwordData.newPassword.length > 8 ||
      !/^[A-Z]/.test(passwordData.newPassword) ||
      !/[^a-zA-Z0-9\s]/.test(passwordData.newPassword)
    ) {
      toast.error('Password must be 6-8 characters, start with capital letter, and have a special character.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.put('/users/profile/password', {
        newPassword: passwordData.newPassword
      });
      toast.success('Password updated successfully!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleRemoveSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to log out this device?')) return;
    try {
      await api.delete(`/users/session/${sessionId}`);
      toast.success('Session removed successfully');
      fetchProfile();
    } catch (error) {
      toast.error('Failed to remove session');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
          <FiUser className="mr-2 text-primary" /> Profile Settings
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account details and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Password */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Details Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center">
                <FiUser className="mr-2" /> Personal Information
              </h3>
              <button 
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className={`text-sm font-medium ${isEditingProfile ? 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300' : 'text-primary hover:text-primary-dark'} transition-colors`}
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
            <form onSubmit={handleUpdateDetails} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                      disabled={!isEditingProfile}
                      className={`w-full border rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white ${!isEditingProfile ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!isEditingProfile}
                      className={`w-full border rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white ${!isEditingProfile ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={!isEditingProfile}
                      className={`w-full border rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white ${!isEditingProfile ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <div className="relative">
                    <FiShield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" disabled value={profile?.role || ''}
                      className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
              {isEditingProfile && (
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={isSavingDetails} className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-sm disabled:opacity-70">
                    {isSavingDetails ? 'Saving...' : <><FiSave className="mr-2" /> Save Details</>}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center">
                <FiLock className="mr-2" /> Change Password
              </h3>
            </div>
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <input 
                    type="password" required value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                  <input 
                    type="password" required value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={isSavingPassword} className="bg-gray-800 hover:bg-black dark:bg-gray-600 dark:hover:bg-gray-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-sm disabled:opacity-70">
                  {isSavingPassword ? 'Updating...' : <><FiLock className="mr-2" /> Update Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Active Sessions */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center">
                <FiMonitor className="mr-2" /> Active Devices
              </h3>
            </div>
            <div className="p-0">
              {profile?.sessions && profile.sessions.length > 0 ? (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {profile.sessions.map((session, index) => (
                    <li key={session._id || index} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1">
                            <FiMonitor size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                              {session.deviceInfo?.split(' ')[0] || 'Unknown Device'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[150px]" title={session.deviceInfo}>
                              {session.deviceInfo}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
                                {session.ipAddress}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                              Last active: {new Date(session.lastActive).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveSession(session._id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Log out device"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <FiMonitor className="mx-auto text-3xl mb-3 opacity-50" />
                  <p className="text-sm">No active sessions tracked.</p>
                  <p className="text-xs mt-1 opacity-70">Sign in again to track devices.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
