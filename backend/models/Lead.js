import mongoose from 'mongoose';

const leadSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
    },
    companyName: {
      type: String,
    },
    job: {
      type: String,
    },
    source: {
      type: String,
      default: 'Website',
    },
    status: {
      type: String,
      enum: ['Not picking', 'Interested', 'Follow up', 'Document pending', 'Rejected', 'Onboarded'],
      default: 'Not picking',
    },
    notes: {
      type: String,
    },
    followUpDate: {
      type: Date,
    },
    callScheduledAt: {
      type: Date,
    },
    reminder: {
      type: String,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
