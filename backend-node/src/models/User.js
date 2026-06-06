import mongoose, { Schema, model } from 'mongoose';

const UserBaseSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  accountType: { type: String, enum: ['CLIENT', 'EMPLOYEE', 'GUARDIAN', 'COMMITTEE'], required: true },
}, { timestamps: true, discriminatorKey: 'accountType' });

export const UserModel = model('User', UserBaseSchema);

const MoodLogSchema = new Schema(
  {
    loggedAt:    { type: Date, default: Date.now, index: true },
    battery:     { type: Number, min: 1, max: 5, required: true },
    brainFog:    { type: Number, min: 1, max: 5, required: true },
    anxiety:     { type: Number, min: 1, max: 5, required: true },
    energy:      { type: Number, min: 1, max: 5, required: true },
    sociability: { type: Number, min: 1, max: 5, required: true },
    note:        { type: String, maxlength: 200, default: '' },
    compositeDistress: { type: Number, default: null },
  },
  { _id: true }
);

// Client Discriminator Schema (Fuses with Consumer Rewards system)
export const ClientUserModel = UserModel.discriminator('CLIENT', new Schema({
  rewardsBalance: { type: Number, default: 0 },
  guardianSyncToken: { type: String, default: null }, // Replaces the old inviteCode
  guardianSyncExpiresAt: { type: Date, default: null },
  guardianId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  patientIntake: { type: Schema.Types.Mixed, default: null },
  privacyConsent: { type: Schema.Types.Mixed, default: null },
  dailyMoodLogs: { type: [MoodLogSchema], default: [] },
}));

// Employee Discriminator Schema (Fuses with the anonymized Cohort Shield system)
export const EmployeeUserModel = UserModel.discriminator('EMPLOYEE', new Schema({
  employeeId: { type: String, required: true, unique: true, sparse: true },
  cohort: { type: String, enum: ['ENGINEERING', 'MARKETING', 'OPERATIONS', 'PRODUCT', 'HR'], required: true }
}));

// Guardian Discriminator Schema (Stateless Reviewer)
export const GuardianUserModel = UserModel.discriminator('GUARDIAN', new Schema({
  linkedClientIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  guardianIntakes: [{ type: Schema.Types.Mixed, default: [] }],
}));

// Committee Discriminator Schema (Stateless Reviewer)
export const CommitteeUserModel = UserModel.discriminator('COMMITTEE', new Schema({
  auditLogs: [{ type: String }],
}));
