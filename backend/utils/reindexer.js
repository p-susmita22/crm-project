import Customer from '../models/Customer.js';

export const reindexCustomers = async () => {
  // Re-indexing is disabled because forcing sequential IDs causes 
  // MongoDB E11000 duplicate key collisions when customers are added/deleted.
  // We now use timestamp-based unique IDs (see customerImporter.js).
  return;
};
