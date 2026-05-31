import mongoose from 'mongoose';

const archivedEmployeeSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    employeeId: { type: String },
    role: { type: String },
    deletedAt: { type: Date, default: Date.now },
    stats: {
      totalCustomers: { type: Number, default: 0 },
      convertedLeads: { type: Number, default: 0 },
      rejectedCustomers: { type: Number, default: 0 },
      pendingCustomers: { type: Number, default: 0 },
      otherCustomers: { type: Number, default: 0 },
    },
    // We store the snapshot of the customers that were assigned to them
    customers: [
      {
        customerId: String,
        name: String,
        phone: String,
        email: String,
        companyName: String,
        status: String,
        onboarding: String,
        taskDate: String,
        sourceFile: String,
      }
    ]
  },
  { timestamps: true }
);

const ArchivedEmployee = mongoose.model('ArchivedEmployee', archivedEmployeeSchema);

export default ArchivedEmployee;
