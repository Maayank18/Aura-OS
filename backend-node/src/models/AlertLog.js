// src/models/AlertLog.js
// Tracks every clinical alert sent to a guardian.
// Used by the Observer Portal to display the triage history log.

import mongoose from 'mongoose';

const AlertLogSchema = new mongoose.Schema(
  {
    // Who triggered the alert
    userId:        { type: String, required: true, index: true },        // patient.userStateId
    patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null, index: true },
    guardianId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', default: null, index: true },
    // Contact details
    guardianPhone: { type: String },
    guardianEmail: { type: String },
    channel:       { type: String, enum: ['whatsapp', 'sms', 'email', 'mock'], default: 'mock' },
    // Clinical signal
    riskLevel:     { type: String, enum: ['pre-burnout', 'acute-distress', 'watch'], default: 'pre-burnout' },
    triggerReason: { type: String, maxlength: 400 },
    briefText:     { type: String, maxlength: 3000 },
    deliveryStatus:{ type: String, enum: ['sent', 'failed', 'mock'], default: 'mock' },
    twilioSid:     { type: String },
    sentAt:        { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AlertLogSchema.index({ userId: 1, sentAt: -1 });
AlertLogSchema.index({ patientId: 1, sentAt: -1 });
AlertLogSchema.index({ guardianId: 1, sentAt: -1 });

const AlertLog = mongoose.model('AlertLog', AlertLogSchema);
export default AlertLog;