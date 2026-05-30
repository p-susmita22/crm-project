import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, admin } from '../middleware/authMiddleware.js';
import Settings from '../models/Settings.js';

const router = express.Router();

// @desc    Get global settings (scripts)
// @route   GET /api/settings
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  res.json(settings);
}));

// @desc    Update global settings (scripts)
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', protect, admin, asyncHandler(async (req, res) => {
  const { sellerScript, districtPartnerScript } = req.body;
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings();
  }
  
  if (sellerScript !== undefined) settings.sellerScript = sellerScript;
  if (districtPartnerScript !== undefined) settings.districtPartnerScript = districtPartnerScript;
  
  await settings.save();
  res.json(settings);
}));

export default router;
