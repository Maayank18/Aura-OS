// src/routes/clinical.js  🌟 NEW
import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  triggerAlertHandler,
  logVocalStressHandler,
  setGuardianHandler,
  getDashboardMetricsHandler,
  generateTherapyBriefHandler,
} from '../controllers/clinicalCtrl.js';

const router = express.Router();

// Panic trigger from TaskShatter (most critical — fast path)
router.post('/trigger-alert',   asyncHandler(triggerAlertHandler));

// Vocal stress event logging (called by Python backend proxy or direct)
router.post('/vocal-stress',    asyncHandler(logVocalStressHandler));

// Guardian setup/update
router.post('/guardian',        asyncHandler(setGuardianHandler));
router.put('/guardian',         asyncHandler(setGuardianHandler));

// Observer Portal data
router.get('/dashboard/:userId',asyncHandler(getDashboardMetricsHandler));

// Therapy brief generation
router.post('/therapy-brief',   asyncHandler(generateTherapyBriefHandler));

export default router;