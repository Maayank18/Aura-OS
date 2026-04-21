import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Guardian from '../models/Guardian.js';
import Patient from '../models/Patient.js';
import UserState from '../models/UserState.js';
import { AppError } from '../middleware/errorHandler.js';
import { signAuthToken } from '../middleware/auth.js';

const PASSWORD_MIN = 8;
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

const sanitizeString = (value, max = 200) => String(value || '').trim().slice(0, max);
const normalizeEmail = (email) => sanitizeString(email, 240).toLowerCase();
const normalizeInviteCode = (code) => String(code || '').trim().replace(/[^a-z0-9]/gi, '').toUpperCase();

const makeInviteCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
};

const hashPassword = async (password) => {
  if (!password || String(password).length < PASSWORD_MIN) {
    throw new AppError(`Password must be at least ${PASSWORD_MIN} characters.`, 400);
  }
  return bcrypt.hash(String(password), 12);
};

const derivePatientScores = (answers = []) => {
  const map = Object.fromEntries(answers.map((a) => [a.id, Number(a.value) || 0]));
  const scale = (value) => Math.round((Number(value || 0) / 4) * 10);
  const avg = (keys) => keys.reduce((sum, key) => sum + (map[key] || 0), 0) / Math.max(keys.length, 1);

  const stress = scale(avg(['stress_frequency', 'panic_signals']));
  const sleep = scale(avg(['sleep_disruption']));
  const somaticLoad = scale(avg(['somatic_symptoms', 'sensory_overload']));
  const routineDisruption = scale(avg(['routine_disruption', 'recovery_capacity']));
  const executiveFriction = scale(avg(['task_paralysis', 'focus_volatility', 'social_withdrawal']));
  const overallBaseline = Math.round((stress + sleep + somaticLoad + routineDisruption + executiveFriction) / 5);

  return { stress, sleep, somaticLoad, routineDisruption, executiveFriction, overallBaseline };
};

const deriveGuardianScores = (answers = []) => {
  const map = Object.fromEntries(answers.map((a) => [a.id, Number(a.value) || 0]));
  const scale = (value) => Math.round((Number(value || 0) / 4) * 10);

  const observedIsolation = scale(map.observed_isolation);
  const panicTriggerLoad = scale(map.known_panic_triggers);
  const sleepConcern = scale(map.sleep_disruption);
  const routineConcern = scale(map.routine_collapse);
  const supportFit = scale(4 - (map.support_style || 0));
  const overallConcern = Math.round((observedIsolation + panicTriggerLoad + sleepConcern + routineConcern + supportFit) / 5);

  return { observedIsolation, panicTriggerLoad, sleepConcern, routineConcern, supportFit, overallConcern };
};

const serializePatient = (patient) => ({
  id: patient._id.toString(),
  role: 'patient',
  email: patient.email,
  displayName: patient.displayName,
  userStateId: patient.userStateId,
  guardianId: patient.guardianId?.toString?.() || null,
  patientIntake: patient.patientIntake || {},
  privacyConsent: patient.privacyConsent || {},
});

const serializeGuardian = (guardian) => ({
  id: guardian._id.toString(),
  role: 'guardian',
  email: guardian.email,
  displayName: guardian.displayName,
  linkedPatientIds: (guardian.linkedPatientIds || []).map((id) => id.toString()),
  alertPreferences: guardian.alertPreferences || {},
});

const serializeAccount = (account, role) => role === 'guardian'
  ? serializeGuardian(account)
  : serializePatient(account);

const registerPatient = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const displayName = sanitizeString(req.body.displayName || req.body.name, 120);
  const userStateId = sanitizeString(req.body.userStateId || `patient-${crypto.randomUUID()}`, 120);
  if (!email || !displayName) throw new AppError('email and displayName are required.', 400);

  const existing = await Patient.findOne({ $or: [{ email }, { userStateId }] });
  if (existing) throw new AppError('A patient account already exists for this email or user session.', 409);

  await UserState.findOrCreate(userStateId);
  const patient = await Patient.create({
    email,
    displayName,
    userStateId,
    passwordHash: await hashPassword(req.body.password),
    privacyConsent: {
      reportSharing: req.body.privacyConsent?.reportSharing !== false,
      guardianAlerts: req.body.privacyConsent?.guardianAlerts !== false,
      rawWorrySharing: Boolean(req.body.privacyConsent?.rawWorrySharing),
      consentedAt: new Date(),
    },
  });

  const token = signAuthToken({ id: patient._id, role: 'patient' });
  res.status(201).json({ success: true, token, account: serializePatient(patient) });
};

const registerGuardian = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const displayName = sanitizeString(req.body.displayName || req.body.name, 120);
  if (!email || !displayName) throw new AppError('email and displayName are required.', 400);

  const existing = await Guardian.findOne({ email });
  if (existing) throw new AppError('A guardian account already exists for this email.', 409);

  const guardian = await Guardian.create({
    email,
    displayName,
    passwordHash: await hashPassword(req.body.password),
    alertPreferences: req.body.alertPreferences || {},
  });

  const token = signAuthToken({ id: guardian._id, role: 'guardian' });
  res.status(201).json({ success: true, token, account: serializeGuardian(guardian) });
};

const login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const preferredRole = req.body.role;

  const candidates = [];
  if (!preferredRole || preferredRole === 'patient') {
    const patient = await Patient.findOne({ email }).select('+passwordHash');
    if (patient) candidates.push({ role: 'patient', account: patient });
  }
  if (!preferredRole || preferredRole === 'guardian') {
    const guardian = await Guardian.findOne({ email }).select('+passwordHash');
    if (guardian) candidates.push({ role: 'guardian', account: guardian });
  }

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await bcrypt.compare(password, candidate.account.passwordHash);
    if (ok) {
      candidate.account.authMeta = { ...(candidate.account.authMeta?.toObject?.() || candidate.account.authMeta || {}), lastLoginAt: new Date() };
      await candidate.account.save();
      const token = signAuthToken({ id: candidate.account._id, role: candidate.role });
      return res.json({ success: true, token, account: serializeAccount(candidate.account, candidate.role) });
    }
  }

  throw new AppError('Invalid email or password.', 401);
};

const me = async (req, res) => {
  res.json({ success: true, account: serializeAccount(req.auth.account, req.auth.role) });
};

const savePatientIntake = async (req, res) => {
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  if (answers.length !== 10) throw new AppError('Patient intake requires 10 answers.', 400);

  const normalized = answers.map((answer) => ({
    id: sanitizeString(answer.id, 80),
    label: sanitizeString(answer.label, 160),
    value: Math.min(4, Math.max(0, Number(answer.value))),
  })).filter((answer) => answer.id && Number.isFinite(answer.value));

  if (normalized.length !== 10) throw new AppError('Patient intake answers are invalid.', 400);

  const patient = req.auth.account;
  patient.patientIntake = {
    answers: normalized,
    derivedScores: derivePatientScores(normalized),
    completedAt: new Date(),
  };
  if (req.body.privacyConsent) {
    patient.privacyConsent = {
      reportSharing: req.body.privacyConsent.reportSharing !== false,
      guardianAlerts: req.body.privacyConsent.guardianAlerts !== false,
      rawWorrySharing: Boolean(req.body.privacyConsent.rawWorrySharing),
      consentedAt: new Date(),
    };
  }
  await patient.save();

  const user = await UserState.findOrCreate(patient.userStateId);
  user.clinicalTelemetry.baselineArousalScore = patient.patientIntake.derivedScores.overallBaseline || null;
  user.clinicalTelemetry.baselineArousalSetAt = new Date();
  user.clinicalTelemetry.baselineProfile = {
    ...(user.clinicalTelemetry.baselineProfile || {}),
    patientIntake: patient.patientIntake.derivedScores,
  };
  await user.save();

  res.json({ success: true, patientIntake: patient.patientIntake, privacyConsent: patient.privacyConsent, account: serializePatient(patient) });
};

const generateInviteCode = async (req, res) => {
  const patient = req.auth.account;
  const code = makeInviteCode();
  patient.inviteCodeHash = Patient.hashInviteCode(normalizeInviteCode(code));
  patient.inviteCodeExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
  patient.inviteCodeUsedAt = null;
  await patient.save();

  res.json({
    success: true,
    inviteCode: code,
    expiresAt: patient.inviteCodeExpiresAt,
  });
};

const linkPatient = async (req, res) => {
  const code = normalizeInviteCode(req.body.inviteCode);
  if (code.length < 6) throw new AppError('A valid invite code is required.', 400);

  const codeHash = Patient.hashInviteCode(code);
  const patient = await Patient.findOne({
    inviteCodeHash: codeHash,
    inviteCodeExpiresAt: { $gt: new Date() },
    inviteCodeUsedAt: null,
  }).select('+inviteCodeHash');

  if (!patient) throw new AppError('Invite code is invalid, expired, or already used.', 400);
  if (patient.guardianId) throw new AppError('This patient is already linked to a guardian.', 409);

  const guardian = req.auth.account;
  patient.guardianId = guardian._id;
  patient.inviteCodeUsedAt = new Date();
  await patient.save();

  if (!guardian.linkedPatientIds.some((id) => id.equals(patient._id))) {
    guardian.linkedPatientIds.push(patient._id);
    await guardian.save();
  }

  res.json({
    success: true,
    patient: {
      id: patient._id.toString(),
      displayName: patient.displayName,
      userStateId: patient.userStateId,
      intakeRequired: !guardian.guardianIntakes.some((intake) => intake.patientId.equals(patient._id)),
    },
  });
};

const saveGuardianIntake = async (req, res) => {
  const { patientId } = req.params;
  const guardian = req.auth.account;
  if (!guardian.linkedPatientIds.some((id) => id.toString() === patientId)) {
    throw new AppError('Guardian is not linked to this patient.', 403);
  }

  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  if (answers.length !== 5) throw new AppError('Guardian intake requires 5 answers.', 400);

  const normalized = answers.map((answer) => ({
    id: sanitizeString(answer.id, 80),
    label: sanitizeString(answer.label, 180),
    value: Math.min(4, Math.max(0, Number(answer.value))),
  })).filter((answer) => answer.id && Number.isFinite(answer.value));

  if (normalized.length !== 5) throw new AppError('Guardian intake answers are invalid.', 400);

  const nextIntake = {
    patientId,
    answers: normalized,
    derivedScores: deriveGuardianScores(normalized),
    completedAt: new Date(),
  };

  guardian.guardianIntakes = [
    ...(guardian.guardianIntakes || []).filter((intake) => intake.patientId.toString() !== patientId),
    nextIntake,
  ];
  await guardian.save();

  res.json({ success: true, guardianIntake: nextIntake });
};

const getGuardianPatients = async (req, res) => {
  const guardian = await Guardian.findById(req.auth.id).populate('linkedPatientIds', 'displayName email userStateId patientIntake privacyConsent guardianId');
  const patients = (guardian?.linkedPatientIds || []).map((patient) => {
    const intake = (guardian.guardianIntakes || []).find((item) => item.patientId.toString() === patient._id.toString());
    return {
      id: patient._id.toString(),
      displayName: patient.displayName,
      email: patient.email,
      userStateId: patient.userStateId,
      patientIntakeCompleted: Boolean(patient.patientIntake?.completedAt),
      guardianIntakeCompleted: Boolean(intake?.completedAt),
      privacyConsent: patient.privacyConsent || {},
      guardianIntake: intake || null,
    };
  });

  res.json({ success: true, patients });
};

// ── POST /api/auth/patient/mood-log ───────────────────────────────────────
// Saves a 5-axis emoji mood log to the authenticated patient's account.
const logMoodEntry = async (req, res) => {
  const patient = req.auth.account;
  const { battery, brainFog, anxiety, energy, sociability, note } = req.body;

  const clamp = (v, min = 1, max = 5) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));

  const log = {
    loggedAt:    new Date(),
    battery:     clamp(battery),
    brainFog:    clamp(brainFog),
    anxiety:     clamp(anxiety),
    energy:      clamp(energy),
    sociability: clamp(sociability),
    note:        String(note || '').trim().slice(0, 200),
    compositeDistress: Math.round(((clamp(anxiety) + clamp(brainFog)) - (clamp(battery) + clamp(energy) + clamp(sociability))) * 10) / 10,
  };

  patient.dailyMoodLogs.push(log);
  // Keep rolling 90-day window
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  patient.dailyMoodLogs = patient.dailyMoodLogs.filter(l => l.loggedAt > cutoff);
  await patient.save();

  res.json({ success: true, moodLog: log, totalLogs: patient.dailyMoodLogs.length });
};

// ── GET /api/auth/patient/mood-logs ─────────────────────────────────────
// Returns the last N mood log entries for the authenticated patient.
const getMoodLogs = async (req, res) => {
  const patient = req.auth.account;
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 7));
  const logs = (patient.dailyMoodLogs || [])
    .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt))
    .slice(0, limit)
    .reverse(); // Chronological for chart rendering
  res.json({ success: true, moodLogs: logs });
};

export {
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
};
