import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import axios from 'axios';
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

  const user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, 'i') }).select('+password');

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
    if (user.role === 'Employee' && user.isActive === false) {
      res.status(403);
      throw new Error('Account disabled. Please contact the administrator.');
    }

    const token = generateToken(res, user._id);

    // Track session
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';
    
    user.sessions.push({
      token,
      deviceInfo,
      ipAddress,
      lastActive: Date.now()
    });
    
    // Keep only last 10 sessions to prevent document bloat
    if (user.sessions.length > 10) {
      user.sessions = user.sessions.slice(-10);
    }
    await user.save({ validateBeforeSave: false });

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

  const userExists = await User.findOne({ email: new RegExp(`^${email.trim()}$`, 'i') });

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
    email: email.trim().toLowerCase(),
    password,
    plainPassword: password, // Store plain password for admin viewing as requested
    role: role || 'Employee',
    phone,
    employeeId: nextEmpId,
    customerFile,
    assignedCallsCount: 0
  });

  if (user) {
    if (req.file) {
      try {
        await importCustomersFromFile(req.file.buffer, user._id, undefined, req.file.originalname);
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
  const { name, email, phone, password } = req.body;

  const userExists = await User.findOne({ $or: [{ email }, { phone }] });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'Admin', // Force Admin role
  });

  if (user) {
    res.status(201).json({
      message: 'Admin account created successfully. Please log in.',
      email: user.email,
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

// @desc    Send OTP to admin phone for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Please provide an email address');
  }

  const user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, 'i') });
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

  // Send OTP via Email instead of SMS
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #19B681;">Password Reset Verification</h2>
      <p>Hello ${user.name},</p>
      <p>You requested to reset your admin password. Please use the following OTP to proceed:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <h1 style="margin: 0; letter-spacing: 5px; color: #333;">${otp}</h1>
      </div>
      <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes. If you did not request this, please secure your account.</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: 'CRM Admin Password Reset OTP',
    html: htmlContent
  });

  res.json({ message: 'OTP sent to your registered email address', email: user.email });
});

// @desc    Verify OTP submitted by admin
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, 'i') });
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

  const user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, 'i') });
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
