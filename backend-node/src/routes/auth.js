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
  registerUser,
  saveGuardianIntake,
  savePatientIntake,
} from '../controllers/authCtrl.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateRegistration, validateCommitteeAudit } from '../middleware/validateAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.post('/patient/register', asyncHandler(registerPatient));
router.post('/guardian/register', asyncHandler(registerGuardian));
router.post('/register', validateRegistration, asyncHandler(registerUser));
router.post('/login', (req, res, next) => {
  if (req.body.role === 'committee') {
    return validateCommitteeAudit(req, res, next);
  }
  next();
}, asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));

router.post('/patient/intake', requireAuth, requireRole('patient', 'client'), asyncHandler(savePatientIntake));
router.post('/patient/invite-code', requireAuth, requireRole('patient', 'client'), asyncHandler(generateInviteCode));
router.post('/patient/mood-log', requireAuth, requireRole('patient', 'client'), asyncHandler(logMoodEntry));
router.get('/patient/mood-logs', requireAuth, requireRole('patient', 'client'), asyncHandler(getMoodLogs));

router.post('/guardian/link-patient', requireAuth, requireRole('guardian', 'committee'), asyncHandler(linkPatient));
router.post('/guardian/patient/:patientId/intake', requireAuth, requireRole('guardian', 'committee'), asyncHandler(saveGuardianIntake));
router.get('/guardian/patients', requireAuth, requireRole('guardian', 'committee'), asyncHandler(getGuardianPatients));

export default router;
