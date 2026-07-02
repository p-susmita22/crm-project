import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const customerSchema = mongoose.Schema({
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  callHistory: [{ date: Date, status: String, remark: String, employeeName: String }]
}, { strict: false });
const Customer = mongoose.model('Customer', customerSchema);

const userSchema = mongoose.Schema({
  name: String
}, { strict: false });
const User = mongoose.model('User', userSchema);

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB for backfilling employee names.');
  
  const customers = await Customer.find({ 'callHistory.employeeName': { $exists: false } }).populate('assignedTo');
  console.log(`Found ${customers.length} customers needing backfill.`);
  
  let updatedCount = 0;
  for (let customer of customers) {
    let changed = false;
    let fallbackName = 'Unknown';
    if (customer.assignedTo && customer.assignedTo.name) {
      fallbackName = customer.assignedTo.name;
    }
    
    for (let i = 0; i < customer.callHistory.length; i++) {
      if (!customer.callHistory[i].employeeName) {
        customer.callHistory[i].employeeName = fallbackName;
        changed = true;
      }
    }
    
    if (changed) {
      await customer.save();
      updatedCount++;
    }
  }
  
  // also backfill the ones that explicitly have 'Unknown' from our merge script, if we can do better
  const unknownCustomers = await Customer.find({ 'callHistory.employeeName': 'Unknown' }).populate('assignedTo');
  for (let customer of unknownCustomers) {
    let changed = false;
    let fallbackName = 'Unknown';
    if (customer.assignedTo && customer.assignedTo.name) {
      fallbackName = customer.assignedTo.name;
    }
    
    if (fallbackName !== 'Unknown') {
      for (let i = 0; i < customer.callHistory.length; i++) {
        if (!customer.callHistory[i].employeeName || customer.callHistory[i].employeeName === 'Unknown') {
          customer.callHistory[i].employeeName = fallbackName;
          changed = true;
        }
      }
    }
    
    if (changed) {
      await customer.save();
      updatedCount++;
    }
  }
  
  console.log(`Backfilled employee names for ${updatedCount} customers.`);
  process.exit(0);
}

run();
