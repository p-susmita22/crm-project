import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { importCustomersFromFile } from '../utils/customerImporter.js';
import { reindexEmployees } from '../utils/employeeReindexer.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password, loginType } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Please provide Email Address');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (user && (await user.matchPassword(password))) {
    // Validate roles based on loginType to restrict cross-dashboard access
    if (loginType === 'Admin' && user.role !== 'Admin') {
      res.status(403);
      throw new Error('Access denied. Employees cannot sign in to the Admin Dashboard.');
    }
    if (loginType === 'Employee' && user.role !== 'Employee') {
      res.status(403);
      throw new Error('Access denied. Admins cannot sign in to the Employee Dashboard.');
    }

    const token = generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      employeeId: user.employeeId,
      customerFile: user.customerFile,
      assignedCallsCount: user.assignedCallsCount,
      token,
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new user (Admin or Employee)
// @route   POST /api/auth/register
// @access  Private/Admin
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, employeeId, assignedCallsCount } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  let customerFile = undefined;
  if (req.file) {
    customerFile = {
      originalName: req.file.originalname,
      uploadedAt: new Date()
    };
  }

  // Re-index existing employees and assign the next sequential ID
  await reindexEmployees();
  const empCount = await User.countDocuments({ role: 'Employee' });
  const nextEmpId = `emp-${String(empCount + 1).padStart(3, '0')}`;

  let user = await User.create({
    name,
    email,
    password,
    role: role || 'Employee',
    phone,
    employeeId: nextEmpId,
    customerFile,
    assignedCallsCount: Number(assignedCallsCount) || 0
  });

  if (user) {
    if (req.file) {
      try {
        await importCustomersFromFile(req.file.buffer, user._id);
        user = await User.findById(user._id);
      } catch (err) {
        console.error('Failed to import customers on register:', err);
      }
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      employeeId: user.employeeId,
      customerFile: user.customerFile,
      assignedCallsCount: user.assignedCallsCount
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Register a new Admin (Public for demo purposes)
// @route   POST /api/auth/admin-signup
// @access  Public
const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'Admin', // Force Admin role
  });

  if (user) {
    const token = generateToken(res, user._id); // Auto login
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ message: 'Logged out successfully' });
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      employeeId: user.employeeId,
      customerFile: user.customerFile,
      assignedCallsCount: user.assignedCallsCount,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Send OTP to admin email for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Please provide an email address');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    res.status(404);
    throw new Error('No account found with that email address');
  }

  // Only Admins can reset password via this flow
  if (user.role !== 'Admin') {
    res.status(403);
    throw new Error('Password reset is only available for Admin accounts');
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.otpCode = otp;
  user.otpExpiry = expiry;
  user.otpVerified = false;
  await user.save({ validateBeforeSave: false });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 16px;">
      <h2 style="color: #1e3a8a; margin-bottom: 8px;">🔐 Password Reset OTP</h2>
      <p style="color: #374151; margin-bottom: 24px;">You requested a password reset for your CRM Admin account.</p>
      <div style="background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">Your OTP Code</p>
        <p style="font-size: 40px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.2em; margin: 0;">${otp}</p>
        <p style="font-size: 12px; color: #ef4444; margin-top: 8px;">Expires in 10 minutes</p>
      </div>
      <p style="color: #6b7280; font-size: 13px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject: 'CRM Admin – Password Reset OTP', html });

  res.json({ message: 'OTP sent to your email address', email: user.email });
});

// @desc    Verify OTP submitted by admin
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.otpCode || !user.otpExpiry) {
    res.status(400);
    throw new Error('No OTP was requested. Please request a new one.');
  }

  if (new Date() > user.otpExpiry) {
    res.status(400);
    throw new Error('OTP has expired. Please request a new one.');
  }

  if (user.otpCode !== otp.trim()) {
    res.status(400);
    throw new Error('Invalid OTP. Please try again.');
  }

  user.otpVerified = true;
  await user.save({ validateBeforeSave: false });

  res.json({ message: 'OTP verified successfully', email: user.email });
});

// @desc    Reset password after OTP verification
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.otpVerified) {
    res.status(400);
    throw new Error('OTP not verified. Please complete verification first.');
  }

  // Apply password constraints
  if (
    newPassword.length < 6 ||
    newPassword.length > 8 ||
    !/^[A-Z]/.test(newPassword) ||
    !/[^a-zA-Z0-9\s]/.test(newPassword)
  ) {
    res.status(400);
    throw new Error('Password must be 6-8 characters, start with a capital letter, and contain a special character');
  }

  user.password = newPassword;
  user.otpCode = undefined;
  user.otpExpiry = undefined;
  user.otpVerified = false;
  await user.save();

  res.json({ message: 'Password reset successfully. Please log in with your new password.' });
});

export { authUser, registerUser, logoutUser, getUserProfile, registerAdmin, forgotPassword, verifyOtp, resetPassword };
