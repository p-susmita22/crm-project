import mongoose from 'mongoose';

const workSubmissionSchema = mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeName: { type: String, required: true },
    submissionDate: { type: String, required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model('WorkSubmission', workSubmissionSchema);
