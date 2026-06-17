import mongoose from 'mongoose';

const customerSchema = mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
    },
    email: {
      type: String,
    },
    companyName: {
      type: String,
    },
    address: {
      type: String,
    },
    fullAddress: {
      type: String,
    },
    pincode: {
      type: String,
    },
    state: {
      type: String,
    },
    district: {
      type: String,
    },
    job: {
      type: String,
    },
    onboarding: {
      type: String,
      enum: ['District Partner', 'Seller', 'Interview Call', ''],
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Agree', 'Reject', 'Others'],
      default: 'Pending',
    },
    otherReason: {
      type: String,
    },
    sourceFile: {
      type: String,
    },
    notes: {
      type: String,
    },
    followUpDate: {
      type: Date,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    taskDate: {
      type: String, // stored as 'YYYY-MM-DD' for easy date-wise grouping
      default: () => new Date().toISOString().split('T')[0],
    },
    callHistory: [
      {
        date: { type: Date, default: Date.now },
        status: String,
        remark: String,
      }
    ],
  },
  {
    timestamps: true,
  }
);

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
