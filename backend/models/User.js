import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    plainPassword: {
      type: String,
    },
    role: {
      type: String,
      enum: ['Admin', 'Employee'],
      default: 'Employee',
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true, // Allows nulls to be ignored in unique index
    },
    phone: {
      type: String,
    },
    dailyCallCount: {
      type: Number,
      default: 0,
    },
    positiveReviews: {
      type: Number,
      default: 0,
    },
    negativeReviews: {
      type: Number,
      default: 0,
    },
    workingHours: {
      type: Number,
      default: 0,
    },
    performanceStatus: {
      type: String,
      enum: ['Excellent', 'Good', 'Average', 'Poor'],
      default: 'Good',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    sessionStart: {
      type: Date,
    },
    todayWorkingSeconds: {
      type: Number,
      default: 0,
    },
    lastSeenAt: {
      type: Date,
    },
    customerFile: {
      fileName: { type: String },
      originalName: { type: String },
      filePath: { type: String },
      uploadedAt: { type: Date }
    },
    assignedCallsCount: {
      type: Number,
      default: 0
    },
    otpCode: { type: String },
    otpExpiry: { type: Date },
    otpVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;
