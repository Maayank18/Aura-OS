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
  generateRecoveryProtocolHandler,
  logGameSessionHandler,
} from '../controllers/clinicalCtrl.js';
import { voiceTriageHandler } from '../controllers/voiceTriageCtrl.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Panic trigger from TaskShatter (most critical — fast path)
router.post('/trigger-alert', requireAuth, asyncHandler(triggerAlertHandler));

// Vocal stress event logging
router.post('/vocal-stress', requireAuth, asyncHandler(logVocalStressHandler));

// New Aura Voice Semantic Triage
router.post('/voice-triage', requireAuth, asyncHandler(voiceTriageHandler));

// Game session telemetry logging
router.post('/game-session', requireAuth, asyncHandler(logGameSessionHandler));

// Guardian setup/update
router.post('/guardian', requireAuth, asyncHandler(setGuardianHandler));
router.put('/guardian', requireAuth, asyncHandler(setGuardianHandler));

// Observer Portal data
router.get('/dashboard/:userId', requireAuth, asyncHandler(getDashboardMetricsHandler));

// Authenticated guardian portal data
router.get('/guardian/dashboard', requireAuth, requireRole('guardian'), asyncHandler(getGuardianDashboardHandler));
router.post('/guardian/report', requireAuth, requireRole('guardian'), asyncHandler(generateGuardianDynamicReportHandler));

// Therapy brief generation
router.post('/therapy-brief', requireAuth, asyncHandler(generateTherapyBriefHandler));

// Session report generation + manual PDF download
router.post('/session-report', requireAuth, asyncHandler(generateSessionReportHandler));
router.get('/session-report/:reportId/pdf', requireAuth, asyncHandler(downloadSessionReportPdfHandler));

// Recovery Protocol generation
router.post('/recovery-protocol', requireAuth, asyncHandler(generateRecoveryProtocolHandler));

export default router;
