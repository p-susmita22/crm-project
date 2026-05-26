import Customer from '../models/Customer.js';

export const reindexCustomers = async () => {
  try {
    const customers = await Customer.find({}).sort({ createdAt: 1 });
    let idx = 1;
    for (const customer of customers) {
      const targetId = `cus-${String(idx).padStart(3, '0')}`;
      if (customer.customerId !== targetId) {
        customer.customerId = targetId;
        await customer.save();
      }
      idx++;
    }
    console.log('Customer IDs re-indexed successfully.');
  } catch (err) {
    console.error('Error during customer ID re-indexing:', err);
  }
};
