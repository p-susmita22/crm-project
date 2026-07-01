import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const customerSchema = mongoose.Schema({
  phone: String,
  callHistory: [{ date: Date, status: String, remark: String, employeeName: String }]
}, { strict: false });
const Customer = mongoose.model('Customer', customerSchema);

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  const duplicates = await Customer.aggregate([
    { $group: { _id: '$phone', count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  
  console.log(`Found ${duplicates.length} duplicate phone numbers.`);
  
  for (let dup of duplicates) {
    const docs = await Customer.find({ _id: { $in: dup.docs } }).sort({ createdAt: 1 });
    const primary = docs[0];
    
    let allHistory = [];
    for (let i = 0; i < docs.length; i++) {
      if (docs[i].callHistory && docs[i].callHistory.length > 0) {
        allHistory = allHistory.concat(docs[i].callHistory);
      } else {
        // If no call history but it exists, create one from its status
        allHistory.push({
          status: docs[i].status || 'Pending',
          remark: docs[i].notes || 'Legacy record',
          date: docs[i].createdAt || new Date(),
          employeeName: 'Unknown'
        });
      }
    }
    
    // Sort history by date
    allHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    primary.callHistory = allHistory;
    
    // Merge other fields if missing in primary but present in others
    for (let i = 1; i < docs.length; i++) {
      const doc = docs[i];
      if (!primary.name && doc.name) primary.name = doc.name;
      if (!primary.email && doc.email) primary.email = doc.email;
      if (!primary.companyName && doc.companyName) primary.companyName = doc.companyName;
      if (!primary.address && doc.address) primary.address = doc.address;
      // keep the latest status and taskDate
      primary.status = doc.status;
      primary.taskDate = doc.taskDate;
      primary.assignedTo = doc.assignedTo;
    }
    
    await primary.save();
    
    // Delete the duplicates
    const idsToDelete = docs.slice(1).map(d => d._id);
    await Customer.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`Merged ${dup._id} and deleted ${idsToDelete.length} duplicates.`);
  }
  
  console.log('Done merging duplicates.');
  process.exit(0);
}
run();
