import User from '../models/User.js';

export const reindexEmployees = async () => {
  try {
    // Only reindex employees, sorted by creation date to preserve original order
    const employees = await User.find({ role: 'Employee' }).sort({ createdAt: 1 });
    let idx = 1;
    for (const emp of employees) {
      const targetId = `emp-${String(idx).padStart(3, '0')}`;
      if (emp.employeeId !== targetId) {
        // Use updateOne to bypass pre-save hook (we are only changing employeeId)
        await User.updateOne({ _id: emp._id }, { $set: { employeeId: targetId } });
      }
      idx++;
    }
    console.log(`Employee IDs re-indexed successfully (${employees.length} employees).`);
  } catch (err) {
    console.error('Error during employee ID re-indexing:', err);
  }
};
