import express from 'express';
import {
  generateInviteCode,
  getGuardianPatients,
  linkPatient,
  login,
  logMoodEntry,
  getMoodLogs,
  me,
  registerGuardian,
  registerPatient,
  saveGuardianIntake,
  savePatientIntake,
} from '../controllers/authCtrl.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.post('/patient/register', asyncHandler(registerPatient));
router.post('/guardian/register', asyncHandler(registerGuardian));
router.post('/login', asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));

router.post('/patient/intake', requireAuth, requireRole('patient'), asyncHandler(savePatientIntake));
router.post('/patient/invite-code', requireAuth, requireRole('patient'), asyncHandler(generateInviteCode));
router.post('/patient/mood-log', requireAuth, requireRole('patient'), asyncHandler(logMoodEntry));
router.get('/patient/mood-logs', requireAuth, requireRole('patient'), asyncHandler(getMoodLogs));

router.post('/guardian/link-patient', requireAuth, requireRole('guardian'), asyncHandler(linkPatient));
router.post('/guardian/patient/:patientId/intake', requireAuth, requireRole('guardian'), asyncHandler(saveGuardianIntake));
router.get('/guardian/patients', requireAuth, requireRole('guardian'), asyncHandler(getGuardianPatients));

export default router;
