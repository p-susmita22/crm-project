import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  exportCustomersExcel,
  getPincodeInfo,
} from '../controllers/customerController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

// Export routes (must come before /:id)
router.get('/export/excel', protect, exportCustomersExcel);

router.get('/pincode/:pincode', protect, getPincodeInfo);

router.route('/:id')
  .get(protect, getCustomerById)
  .put(protect, updateCustomer)
  .delete(protect, admin, deleteCustomer);

export default router;
