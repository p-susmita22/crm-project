import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import multimaartLogo from '../assets/multimaart-logo.png';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone;

  useEffect(() => {
    if (!phone) navigate('/forgot-password', { replace: true });
  }, [phone, navigate]);

  // Password rules validation
  const rules = [
    { label: '6–8 characters', valid: newPassword.length >= 6 && newPassword.length <= 8 },
    { label: 'Starts with a capital letter', valid: /^[A-Z]/.test(newPassword) },
    { label: 'Contains a special character', valid: /[^a-zA-Z0-9\s]/.test(newPassword) },
    { label: 'Passwords match', valid: newPassword === confirmPassword && confirmPassword.length > 0 },
  ];

  const allValid = rules.every(r => r.valid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allValid) {
      toast.error('Please meet all password requirements');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', { phone, newPassword });
      toast.success('Password reset successfully! Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-secondary/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-primary/10 p-8 md:p-10 border border-gray-100 dark:border-gray-700">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={multimaartLogo} alt="Multimaart Logo" className="h-14 w-auto object-contain" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">CRM</span>
          </div>

          {/* Icon Badge */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FiLock className="text-primary text-3xl" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">Set New Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
            Create a strong new password for your admin account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="block w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(p => !p)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showNew ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="block w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showConfirm ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
            </div>

            {/* Password Rules */}
            {newPassword.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 space-y-2">
                {rules.map((rule, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm transition-colors ${rule.valid ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <FiCheckCircle size={14} className={rule.valid ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'} />
                    {rule.label}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !allValid}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/30"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <FiCheckCircle />}
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">
              <FiArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
