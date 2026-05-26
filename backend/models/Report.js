import mongoose from 'mongoose';

const reportSchema = mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeeId: {
      type: String,
    },
    reportDate: {
      type: String, // stored as YYYY-MM-DD string
      required: true,
    },
    totalCallsAssigned: {
      type: Number,
      required: true,
      default: 0,
    },
    callsDone: {
      type: Number,
      required: true,
      default: 0,
    },
    leadsGenerated: {
      type: Number,
      required: true,
      default: 0,
    },
    positiveResponses: {
      type: Number,
      required: true,
      default: 0,
    },
    negativeResponses: {
      type: Number,
      required: true,
      default: 0,
    },
    additionalNotes: {
      type: String,
      default: '',
    },
    sessionTimeSeconds: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One report per employee per day
reportSchema.index({ employee: 1, reportDate: 1 }, { unique: true });

const Report = mongoose.model('Report', reportSchema);
export default Report;
