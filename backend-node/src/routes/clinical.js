// src/routes/clinical.js  🌟 NEW
import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  triggerAlertHandler,
  logVocalStressHandler,
  setGuardianHandler,
  getGuardianDashboardHandler,
  generateGuardianDynamicReportHandler,
  getDashboardMetricsHandler,
  generateTherapyBriefHandler,
  generateSessionReportHandler,
  downloadSessionReportPdfHandler,
} from '../controllers/clinicalCtrl.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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

// Authenticated guardian portal data
router.get('/guardian/dashboard', requireAuth, requireRole('guardian'), asyncHandler(getGuardianDashboardHandler));
router.post('/guardian/report', requireAuth, requireRole('guardian'), asyncHandler(generateGuardianDynamicReportHandler));

// Therapy brief generation
router.post('/therapy-brief',   asyncHandler(generateTherapyBriefHandler));

// Session report generation + manual PDF download
router.post('/session-report', asyncHandler(generateSessionReportHandler));
router.get('/session-report/:reportId/pdf', asyncHandler(downloadSessionReportPdfHandler));

export default router;
