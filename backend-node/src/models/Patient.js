import crypto from 'crypto';
import mongoose from 'mongoose';

const IntakeAnswerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 80 },
    label: { type: String, default: '', maxlength: 160 },
    value: { type: Number, min: 0, max: 4, required: true },
  },
  { _id: false }
);

const DerivedPatientScoresSchema = new mongoose.Schema(
  {
    stress: { type: Number, min: 0, max: 10, default: 0 },
    sleep: { type: Number, min: 0, max: 10, default: 0 },
    somaticLoad: { type: Number, min: 0, max: 10, default: 0 },
    routineDisruption: { type: Number, min: 0, max: 10, default: 0 },
    executiveFriction: { type: Number, min: 0, max: 10, default: 0 },
    overallBaseline: { type: Number, min: 0, max: 10, default: 0 },
  },
  { _id: false }
);

const PatientIntakeSchema = new mongoose.Schema(
  {
    answers: { type: [IntakeAnswerSchema], default: [] },
    derivedScores: { type: DerivedPatientScoresSchema, default: () => ({}) },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const PrivacyConsentSchema = new mongoose.Schema(
  {
    reportSharing: { type: Boolean, default: true },
    guardianAlerts: { type: Boolean, default: true },
    rawWorrySharing: { type: Boolean, default: false },
    consentedAt: { type: Date, default: null },
  },
  { _id: false }
);

const AuthMetaSchema = new mongoose.Schema(
  {
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { _id: false }
);

const PatientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: ['patient'], default: 'patient', immutable: true },
    userStateId: { type: String, required: true, unique: true, index: true },
    guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', default: null, index: true },
    inviteCodeHash: { type: String, default: null, select: false, index: true },
    inviteCodeExpiresAt: { type: Date, default: null },
    inviteCodeUsedAt: { type: Date, default: null },
    patientIntake: { type: PatientIntakeSchema, default: () => ({}) },
    privacyConsent: { type: PrivacyConsentSchema, default: () => ({}) },
    authMeta: { type: AuthMetaSchema, default: () => ({}) },
  },
  { timestamps: true }
);

PatientSchema.statics.hashInviteCode = function hashInviteCode(code) {
  return crypto.createHash('sha256').update(String(code || '').trim().toUpperCase()).digest('hex');
};

const Patient = mongoose.model('Patient', PatientSchema);
export default Patient;
