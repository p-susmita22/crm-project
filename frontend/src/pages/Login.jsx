import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiMail, FiLock, FiLogIn, FiShield, FiUsers } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import multimaartLogo from '../assets/multimaart-logo.png';
import api from '../api/axios';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, user } = useContext(AuthContext);

  // Detect portal from URL: /admin/login → 'Admin', /employee/login → 'Employee'
  const isAdminPath    = location.pathname === '/admin/login';
  const loginType      = isAdminPath ? 'Admin' : 'Employee';
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname;


  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectPath =
        from && from !== '/' && from !== '/login'
          ? from
          : user.role === 'Admin'
          ? '/admin/dashboard'
          : '/employee/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, from]);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (
      password.length < 6 ||
      password.length > 8 ||
      !/^[A-Z]/.test(password) ||
      !/[^a-zA-Z0-9\s]/.test(password)
    ) {
      toast.error('Password must be 6–8 characters, start with a capital letter, and contain a special character');
      setIsSubmitting(false);
      return;
    }

    await login(email, password, loginType);
    setIsSubmitting(false);
    // Navigation handled by the useEffect above once user state updates
  };

  const isAdmin = loginType === 'Admin';

  return (
    <div className="w-full flex flex-col md:flex-row min-h-full">
      {/* Left side — Branding */}
      <div className={`hidden md:flex md:w-1/2 ${isAdmin ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-gradient-to-br from-emerald-500 to-teal-600'} p-10 flex-col justify-between text-white relative overflow-hidden`}>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <img src={multimaartLogo} alt="Multimaart Logo" className="h-20 w-auto object-contain" />
            <h1 className="text-4xl font-bold">CRM</h1>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-4 ${isAdmin ? 'bg-white/20' : 'bg-white/20'}`}>
            {isAdmin ? <FiShield size={14} /> : <FiUsers size={14} />}
            {isAdmin ? 'Admin Portal' : 'Employee Portal'}
          </div>
          <p className="text-lg opacity-90">
            {isAdmin
              ? 'Manage your eCommerce customers, leads, and team all in one beautiful, modern dashboard.'
              : 'Access your calling tasks, manage leads, and submit daily reports from your employee workspace.'}
          </p>
        </div>

        {/* Decorative blobs */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <p className="text-sm font-medium opacity-80">&copy; 2026 Multimaart. All rights reserved.</p>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Welcome Back</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Sign in to the {loginType} Portal
          </p>
        </div>



        <div className={`flex items-center gap-2 mb-8 px-4 py-3 rounded-xl border text-sm font-semibold ${
          isAdminPath
            ? 'bg-primary/5 border-primary/20 text-primary'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
        }`}>
          {isAdminPath ? <FiShield /> : <FiUsers />}
          {isAdminPath ? 'Admin Portal' : 'Employee Portal'}
          {/* Only admins can switch to the employee view — employees cannot access admin login */}
          {isAdminPath && (
            <Link
              to="/employee/login"
              className="ml-auto text-xs underline opacity-60 hover:opacity-100 transition-opacity font-normal"
            >
              Switch to Employee
            </Link>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiMail className="text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder={isAdminPath ? 'admin@crm.com' : 'employee@crm.com'}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              {isAdmin && (
                <Link to="/forgot-password" className="text-sm text-primary hover:text-primary-dark font-medium transition-colors">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiLock className="text-gray-400" />
              </div>
              <input
                type="password"
                required
                minLength="6"
                maxLength="8"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all ${
              isAdmin
                ? 'bg-primary hover:bg-primary-dark focus:ring-primary shadow-primary/30'
                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-emerald-600/30'
            } shadow-lg`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center">
                <FiLogIn className="mr-2 text-lg" />
                Sign In to {loginType} Portal
              </span>
            )}
          </button>
        </form>

        {/* Signup link — only for Admin */}
        {isAdmin && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Want to setup a new workspace?{' '}
              <Link to="/admin-signup" className="font-medium text-primary hover:text-primary-dark transition-colors">
                Create Admin Account
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

