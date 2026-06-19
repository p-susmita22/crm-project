import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './models/Customer.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const allCustomers = await Customer.find({}).sort({ createdAt: 1 });
  console.log(`Found ${allCustomers.length} customers to reindex.`);
  
  // Step 1: Assign temporary IDs
  console.log('Assigning temporary IDs...');
  let i = 1;
  for (const c of allCustomers) {
    c.customerId = `cus-TEMP-${Date.now()}-${i}`;
    await c.save();
    i++;
  }
  
  // Step 2: Assign proper sequential IDs
  console.log('Assigning sequential IDs...');
  let count = 1;
  for (const c of allCustomers) {
    c.customerId = `cus-${String(count).padStart(3, '0')}`;
    await c.save();
    count++;
  }
  
  console.log('Reindexed all customers successfully!');
  process.exit(0);
}

run();
