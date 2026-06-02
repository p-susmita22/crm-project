import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiShield, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import multimaartLogo from '../assets/multimaart-logo.png';

const VerifyOtp = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  // Redirect back if accessed directly without email
  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true });
  }, [email, navigate]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/auth/verify-otp', { email, otp: otpCode });
      toast.success('OTP verified! Set your new password.');
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('New OTP sent to your email!');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
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
            <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FiShield className="text-green-600 dark:text-green-400 text-3xl" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">Enter OTP</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
            We sent a 6-digit code to
          </p>
          <p className="text-sm font-semibold text-primary text-center mb-8">{email}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input Boxes */}
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white ${
                    digit
                      ? 'border-primary shadow-sm shadow-primary/30'
                      : 'border-gray-200 dark:border-gray-600 focus:border-primary'
                  }`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otp.join('').length !== 6}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/30"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <FiShield />}
              {isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          {/* Resend */}
          <div className="mt-5 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Resend OTP in <span className="font-semibold text-primary">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-semibold transition-colors disabled:opacity-50"
              >
                <FiRefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                {isResending ? 'Sending...' : 'Resend OTP'}
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors font-medium">
              <FiArrowLeft size={14} /> Change Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
