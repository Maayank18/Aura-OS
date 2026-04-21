// src/controllers/clinicalCtrl.js  🌟 NEW
// Handles all clinical / observer-portal API calls.
//
// Routes:
//   POST /api/clinical/trigger-alert    — Panic trigger from TaskShatter
//   POST /api/clinical/vocal-stress     — Logged by Python backend after each session
//   POST /api/clinical/guardian         — Set / update guardian contact
//   GET  /api/clinical/dashboard/:userId— Aggregated recharts-ready data
//   POST /api/clinical/therapy-brief    — Generate 14-day clinical PDF brief

import UserState   from '../models/UserState.js';
import Patient     from '../models/Patient.js';
import Guardian    from '../models/Guardian.js';
import AlertLog    from '../models/AlertLog.js';
import ClinicalReport from '../models/ClinicalReport.js';
import { generateGuardianBrief } from '../services/langchain.js';
import { sendGuardianAlert }     from '../services/twilio.js';
import { sendGuardianReportEmail } from '../services/email.js';
import { buildClinicalReportPdfBuffer } from '../services/reportPdf.js';
import { evaluateBurnoutRisk }   from '../services/triageEngine.js';
import { AppError }              from '../middleware/errorHandler.js';

const toSafeString = (v, max = 300) => String(v || '').trim().slice(0, max);

const normalizeWorryBlocks = (payloadBlocks = [], dbWorries = []) => {
  const fromPayload = Array.isArray(payloadBlocks)
    ? payloadBlocks
        .map((w) => ({
          id: toSafeString(w.id || w.uuid, 80),
          text: toSafeString(w.text || w.worry, 500),
          weight: Math.min(10, Math.max(1, Number(w.weight) || 5)),
          status: ['active', 'destroyed', 'vaulted'].includes(w.status) ? w.status : 'active',
        }))
        .filter((w) => w.text)
    : [];

  if (fromPayload.length) return fromPayload;

  return (Array.isArray(dbWorries) ? dbWorries : [])
    .map((w) => ({
      id: toSafeString(w.id, 80),
      text: toSafeString(w.worry, 500),
      weight: Math.min(10, Math.max(1, Number(w.weight) || 5)),
      status: ['active', 'destroyed', 'vaulted'].includes(w.status) ? w.status : 'active',
    }))
    .filter((w) => w.text);
};

const normalizeTimeline = (payloadTimeline = [], activeTask = null) => {
  const fromPayload = Array.isArray(payloadTimeline)
    ? payloadTimeline
        .map((q, idx) => ({
          order: Number(q.order) || idx + 1,
          id: toSafeString(q.id, 80) || String(idx + 1),
          action: toSafeString(q.action || q.text, 400),
          tip: toSafeString(q.tip, 300),
          duration_minutes: Math.min(30, Math.max(1, Number(q.duration_minutes) || 2)),
          completed: Boolean(q.completed),
        }))
        .filter((q) => q.action)
        .sort((a, b) => a.order - b.order)
    : [];

  if (fromPayload.length) return fromPayload;

  if (!activeTask?.microquests?.length) return [];

  return activeTask.microquests.map((q, idx) => ({
    order: idx + 1,
    id: toSafeString(q.id, 80) || String(idx + 1),
    action: toSafeString(q.action || q.text, 400),
    tip: toSafeString(q.tip, 300),
    duration_minutes: Math.min(30, Math.max(1, Number(q.duration_minutes) || 2)),
    completed: Boolean(q.completed),
  }));
};

const buildPublicReportUrl = (req, reportId) => {
  const base =
    process.env.REPORT_PUBLIC_BASE_URL
    || `${req.protocol}://${req.get('host')}`;
  return `${base}/api/clinical/session-report/${reportId}/pdf`;
};

const deliveryStatusFromResult = (result) => {
  if (!result) return { attempted: false, status: 'skipped', sid: null, error: null };
  if (result.skipped) return { attempted: false, status: 'skipped', sid: null, error: result.error || null };
  if (result.mock) return { attempted: true, status: 'mock', sid: result.sid || null, error: null };
  if (result.success) return { attempted: true, status: 'sent', sid: result.sid || result.messageId || null, error: null };
  return { attempted: true, status: 'failed', sid: null, error: result.error || 'Delivery failed' };
};

const normalizeGuardianDays = (days) => {
  const parsed = Number(days) || 7;
  return [7, 14, 21].includes(parsed) ? parsed : 7;
};

const ensureGuardianPatientAccess = async (guardianId, patientId) => {
  const guardian = await Guardian.findById(guardianId);
  if (!guardian) throw new AppError('Guardian account not found.', 404);

  const selectedPatientId = patientId || guardian.linkedPatientIds?.[0]?.toString();
  if (!selectedPatientId) return { guardian, patient: null, guardianIntake: null };

  const isLinked = (guardian.linkedPatientIds || []).some((id) => id.toString() === selectedPatientId);
  if (!isLinked) throw new AppError('Guardian is not linked to this patient.', 403);

  const patient = await Patient.findById(selectedPatientId).lean();
  if (!patient) throw new AppError('Patient not found.', 404);

  const guardianIntake = (guardian.guardianIntakes || []).find((intake) =>
    intake.patientId.toString() === selectedPatientId
  ) || null;

  return { guardian, patient, guardianIntake };
};

const collectRecentGameSessions = (reports = []) => reports.flatMap((report) => [
  ...(Array.isArray(report.gameSessions) ? report.gameSessions : []),
  ...(Array.isArray(report.meta?.gameSessions) ? report.meta.gameSessions : []),
]).filter(Boolean);

const buildCrisisFeed = (alerts = [], telemetry = {}, includeBrief = false) => {
  const spikeItems = (telemetry.stressSpikes || []).map((spike) => ({
    id: `spike-${new Date(spike.timestamp).getTime()}-${spike.trigger || 'event'}`,
    type: 'stress_spike',
    timestamp: spike.timestamp,
    riskLevel: spike.vocalArousal >= 8 ? 'acute-distress' : 'pre-burnout',
    title: spike.trigger || 'Stress spike detected',
    summary: spike.blocker || spike.emotion || 'Arousal spike recorded',
    deliveryStatus: spike.alertSent ? 'sent' : 'logged',
  }));

  const alertItems = alerts.map((alert) => ({
    id: alert._id?.toString?.() || `alert-${alert.sentAt}`,
    type: 'guardian_alert',
    timestamp: alert.sentAt || alert.createdAt,
    riskLevel: alert.riskLevel,
    title: alert.triggerReason || 'Guardian alert',
    summary: includeBrief ? alert.briefText : 'Guardian notification event',
    deliveryStatus: alert.deliveryStatus,
    channel: alert.channel,
  }));

  return [...spikeItems, ...alertItems]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);
};

// ── POST /api/clinical/trigger-alert ─────────────────────────────────────────
// Called when the user selects "Too overwhelming" in the Initiation Coach.
// Simultaneously: generates brief → sends Twilio → logs telemetry spike.
export const triggerAlertHandler = async (req, res, next) => {
  try {
    const {
      userId, taskSummary, currentTask, blocker, selectedBlocker,
      vocalArousal, vocalArousalScore, emotion, recentHistory,
      guardianPhone, guardianName, guardianRelation, alertPreference,
    } = req.body;

    if (!userId) throw new AppError('userId is required.', 400);

    const resolvedTaskSummary = String(taskSummary || currentTask || 'an overwhelming task').trim();
    const resolvedBlocker = String(blocker || selectedBlocker || 'too_overwhelming').trim();
    const parsedArousal = Number(vocalArousal ?? vocalArousalScore);
    const resolvedArousal = Number.isFinite(parsedArousal) ? Math.min(10, Math.max(1, parsedArousal)) : 8;
    const resolvedEmotion = emotion || (resolvedArousal >= 8 ? 'high_anxiety' : resolvedArousal >= 5 ? 'mild_anxiety' : 'calm');

    const user = await UserState.findOrCreate(userId);

    if (guardianPhone || guardianName || guardianRelation || alertPreference) {
      user.guardian = {
        ...(user.guardian?.toObject?.() || user.guardian || {}),
        ...(guardianPhone ? { phone: guardianPhone } : {}),
        ...(guardianName ? { name: guardianName } : {}),
        ...(guardianRelation ? { relation: guardianRelation } : {}),
        ...(alertPreference ? { alertPreference } : {}),
        linkedAt: user.guardian?.linkedAt || new Date(),
      };
    }

    const telemetry = user.clinicalTelemetry || {};
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentExecEvents = (telemetry.executiveFunction || []).filter((e) => new Date(e.timestamp) > dayAgo);
    const tasksAbandonedToday = recentExecEvents.filter((e) => e.status === 'abandoned').length;
    const recentForgeCount = (telemetry.forgeSessions || []).filter((e) => new Date(e.timestamp) > dayAgo).length;
    const recentExecSummary = recentExecEvents.slice(-8).map((e) => `${e.status} "${e.taskSummary || 'task'}"`).join(', ');

    const payloadHistory = (recentHistory && typeof recentHistory === 'object') ? recentHistory : null;
    const payloadHistoryParts = [];
    if (payloadHistory?.tasksAbandonedToday !== undefined) payloadHistoryParts.push(`Frontend signal: ${payloadHistory.tasksAbandonedToday} tasks abandoned today.`);
    if (payloadHistory?.forgeUsage) payloadHistoryParts.push(`Frontend forge usage: ${payloadHistory.forgeUsage}.`);
    if (payloadHistory?.selectedBlockerLabel) payloadHistoryParts.push(`Frontend blocker label: ${payloadHistory.selectedBlockerLabel}.`);

    const recentPattern = [
      `Past 24h telemetry: ${tasksAbandonedToday} abandoned tasks, ${recentForgeCount} forge sessions.`,
      recentExecSummary ? `Recent executive events: ${recentExecSummary}.` : 'No recent task history.',
      ...payloadHistoryParts,
    ].join(' ');

    let brief;
    try {
      const snapshot = req.body.sessionSnapshot || {};
      brief = await generateGuardianBrief({
        userName: userId,
        taskSummary: resolvedTaskSummary,
        blocker: resolvedBlocker,
        vocalArousal: resolvedArousal,
        emotion: resolvedEmotion,
        baselineArousalScore: telemetry.baselineArousalScore || snapshot.baselineArousalScore || null,
        baselineProfile: telemetry.baselineProfile || snapshot.baselineProfile || {},
        lastKnownActivity: req.body.lastKnownActivity || snapshot.lastKnownActivity || null,
        worryBlocks: snapshot.worryBlocks || normalizeWorryBlocks([], user.vaultedWorries || []),
        probeSessions: (telemetry.probeData || []).slice(-5).concat(snapshot.probeSessions || []),
        questTelemetry: snapshot.questTelemetry || [],
        gameSessions: snapshot.gameSessions || [],
        auraAction: 'Somatic interruption (5-second breathing exercise) deployed. Brown noise environment activated.',
        recentPatterns: recentPattern,
      });
    } catch (aiErr) {
      console.warn('[Clinical] LangChain brief generation failed, using fallback.', aiErr.message);
      brief = {
        subject: 'AuraOS Alert - Stress Spike Detected',
        executive_summary: `The user attempted "${resolvedTaskSummary}" but reported acute overwhelm. Executive dysfunction freeze pattern.`,
        somatic_biological_markers: `Vocal arousal detected at ${resolvedArousal}/10 - significantly elevated.`,
        cognitive_rigidity_focus: 'Performance markers indicate high cognitive load and reduced flexibility.',
        actionable_protocol: 'Offer water and a brief walk. Try: "I see you are working really hard. Let\'s take a break together."',
        analogy: 'A computer that has frozen because too many programmes tried to run at once.',
        risk_level: 'pre-burnout',
      };
    }

    user.clinicalTelemetry.stressSpikes.push({
      trigger: resolvedTaskSummary || 'unknown task',
      vocalArousal: resolvedArousal,
      emotion: resolvedEmotion,
      blocker: resolvedBlocker,
      briefSummary: brief.executive_summary?.slice(0, 1000),
    });
    await user.save();

    const resolvedGuardianPhone = guardianPhone || user.guardian?.phone;
    const channel = alertPreference || user.guardian?.alertPreference || 'whatsapp';
    const deliveryResult = await sendGuardianAlert({ brief, userName: userId, guardianPhone: resolvedGuardianPhone, channel });

    const lastSpike = user.clinicalTelemetry.stressSpikes[user.clinicalTelemetry.stressSpikes.length - 1];
    if (lastSpike) {
      lastSpike.alertSent = deliveryResult.success;
      lastSpike.alertChannel = deliveryResult.channel;
      await user.save();
    }

    // Resolve patientId + guardianId for relational AlertLog linking
    const patientRecord = await Patient.findOne({ userStateId: userId }).select('_id guardianId').lean();

    await AlertLog.create({
      userId,
      patientId: patientRecord?._id || null,
      guardianId: patientRecord?.guardianId || null,
      guardianPhone: resolvedGuardianPhone || null,
      channel: deliveryResult.channel,
      riskLevel: brief.risk_level,
      triggerReason: `${resolvedBlocker} during "${resolvedTaskSummary}"`,
      briefText: [brief.executive_summary, brief.actionable_protocol].join('\n\n').slice(0, 3000),
      deliveryStatus: deliveryResult.mock ? 'mock' : (deliveryResult.success ? 'sent' : 'failed'),
      twilioSid: deliveryResult.sid || null,
    });

    res.json({
      success: true, briefGenerated: true, alertSent: deliveryResult.success,
      channel: deliveryResult.channel, riskLevel: brief.risk_level,
      guardianConfigured: Boolean(resolvedGuardianPhone), coachFeedback: brief.analogy,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/clinical/vocal-stress ──────────────────────────────────────────
// Called by Python backend (or Node proxy) after each Aura Voice session.
export const logVocalStressHandler = async (req, res, next) => {
  try {
    const { userId, emotion, arousalScore, taskContext } = req.body;
    if (!userId) throw new AppError('userId is required.', 400);

    const user = await UserState.findOrCreate(userId);
    user.clinicalTelemetry.vocalStressEvents.push({ emotion, arousalScore, taskContext });
    await user.save();

    evaluateBurnoutRisk(userId).then(async (risk) => {
      if (risk.atRisk && risk.riskLevel === 'acute-distress') {
        console.log(`[Triage] Auto-alert triggered for ${userId}: ${risk.riskLevel}`);
      }
    }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};


// ── POST /api/clinical/guardian ───────────────────────────────────────────────
// Set or update the guardian contact for this user.
export const setGuardianHandler = async (req, res, next) => {
  try {
    const { userId, name, email, phone, relation, alertPreference, reportFrequency } = req.body;
    if (!userId) throw new AppError('userId is required.', 400);

    const user = await UserState.findOrCreate(userId);
    const normalizedPhone = phone ? String(phone).trim() : undefined;

    const nextGuardian = {
      ...(user.guardian?.toObject?.() || user.guardian || {}),
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(relation !== undefined ? { relation } : {}),
      ...(alertPreference !== undefined ? { alertPreference } : {}),
      ...(reportFrequency !== undefined ? { reportFrequency } : {}),
      ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
      linkedAt: user.guardian?.linkedAt || new Date(),
    };

    if (
      (nextGuardian.alertPreference === 'whatsapp' || nextGuardian.alertPreference === 'sms')
      && !nextGuardian.phone
    ) {
      throw new AppError('phone is required when alertPreference is whatsapp or sms.', 400);
    }

    user.guardian = nextGuardian;
    await user.save();

    res.json({ success: true, guardian: user.guardian });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/clinical/dashboard/:userId ───────────────────────────────────────
// Returns recharts-ready arrays for the Observer Portal.
export const getGuardianDashboardHandler = async (req, res, next) => {
  try {
    const days = normalizeGuardianDays(req.query.days);
    const { guardian, patient, guardianIntake } = await ensureGuardianPatientAccess(req.auth.id, req.query.patientId);

    if (!patient) {
      return res.json({ success: true, empty: true, patients: [] });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const user = await UserState.findOne({ userId: patient.userStateId }).lean();
    const telemetry = user?.clinicalTelemetry || {};
    const reports = await ClinicalReport.find({ userId: patient.userStateId, createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(20).lean();
    const alerts = await AlertLog.find({
      $or: [
        { userId: patient.userStateId, sentAt: { $gte: since } },
        { patientId: patient._id, sentAt: { $gte: since } },
      ],
    }).sort({ sentAt: -1 }).limit(20).lean();

    // Fetch mood logs directly from Patient model (not UserState)
    const patientWithMood = await Patient.findById(patient._id).select('dailyMoodLogs').lean();
    const moodLogs = (patientWithMood?.dailyMoodLogs || [])
      .filter((l) => new Date(l.loggedAt) > since)
      .sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt))
      .map((l) => ({
        day: new Date(l.loggedAt).toISOString().slice(0, 10),
        battery: l.battery,
        brainFog: l.brainFog,
        anxiety: l.anxiety,
        energy: l.energy,
        sociability: l.sociability,
        compositeDistress: l.compositeDistress,
        note: l.note || '',
      }));

    const vocalRaw = (telemetry.vocalStressEvents || []).filter((e) => new Date(e.timestamp) > since);
    const execRaw = (telemetry.executiveFunction || []).filter((e) => new Date(e.timestamp) > since);
    const forgeRaw = (telemetry.forgeSessions || []).filter((e) => new Date(e.timestamp) > since);
    const spikes = (telemetry.stressSpikes || []).filter((e) => new Date(e.timestamp) > since);
    const gameSessions = collectRecentGameSessions(reports);
    const consent = patient.privacyConsent || {};

    const patients = await Patient.find({ _id: { $in: guardian.linkedPatientIds || [] } })
      .select('displayName email userStateId patientIntake privacyConsent')
      .lean();

    res.json({
      success: true,
      days,
      patient: {
        id: patient._id.toString(),
        displayName: patient.displayName,
        email: patient.email,
        userStateId: patient.userStateId,
        patientIntakeCompleted: Boolean(patient.patientIntake?.completedAt),
        guardianIntakeCompleted: Boolean(guardianIntake?.completedAt),
        privacyConsent: consent,
      },
      patients: patients.map((p) => ({
        id: p._id.toString(),
        displayName: p.displayName,
        email: p.email,
        userStateId: p.userStateId,
        patientIntakeCompleted: Boolean(p.patientIntake?.completedAt),
        reportSharing: p.privacyConsent?.reportSharing !== false,
      })),
      intakes: {
        patient: consent.reportSharing === false ? null : patient.patientIntake || null,
        guardian: guardianIntake || null,
      },
      charts: {
        vsiByDay: _groupByDay(vocalRaw, (e) => e.arousalScore || 5, 'vsi'),
        execByDay: _groupByDayRatio(execRaw, 'efScore'),
        forgeByDay: _groupByDay(forgeRaw, (e) => e.worryDensity || 5, 'density'),
        gameFocusByDay: _groupByDay(gameSessions, (g) => g.predictedEffects?.focusScore || Math.round((g.accuracy || 0) / 10), 'focus'),
        moodByDay: moodLogs,
      },
      stats: {
        tasksCompleted: execRaw.filter((e) => e.status === 'completed').length,
        tasksAbandoned: execRaw.filter((e) => e.status === 'abandoned').length,
        forgeSessions: forgeRaw.length,
        avgVocalArousal: vocalRaw.length ? +(vocalRaw.reduce((s, e) => s + (e.arousalScore || 5), 0) / vocalRaw.length).toFixed(1) : 0,
        stressSpikes: spikes.length,
        gameSessions: gameSessions.length,
        reportsGenerated: reports.length,
        moodCheckins: moodLogs.length,
      },
      crisisFeed: buildCrisisFeed(alerts, { ...telemetry, stressSpikes: spikes }, consent.rawWorrySharing === true),
      recentReports: reports.slice(0, 8).map((report) => ({
        id: report._id.toString(),
        createdAt: report.createdAt,
        riskLevel: report.riskLevel,
        summary: report.aiStressSummary,
        dateRangeDays: report.dateRangeDays || null,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const generateGuardianDynamicReportHandler = async (req, res, next) => {
  try {
    const days = normalizeGuardianDays(req.body?.days);
    const { guardian, patient, guardianIntake } = await ensureGuardianPatientAccess(req.auth.id, req.body?.patientId);
    if (!patient) throw new AppError('No linked patient found.', 404);
    if (patient.privacyConsent?.reportSharing === false) {
      throw new AppError('Patient has not consented to guardian report sharing.', 403);
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const user = await UserState.findOne({ userId: patient.userStateId }).lean();
    const telemetry = user?.clinicalTelemetry || {};
    const alerts = await AlertLog.find({ userId: patient.userStateId, sentAt: { $gte: since } }).sort({ sentAt: -1 }).limit(20).lean();
    const priorReports = await ClinicalReport.find({ userId: patient.userStateId, createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(20).lean();

    const vocalEvents = (telemetry.vocalStressEvents || []).filter((e) => new Date(e.timestamp) > since);
    const execEvents = (telemetry.executiveFunction || []).filter((e) => new Date(e.timestamp) > since);
    const forgeEvents = (telemetry.forgeSessions || []).filter((e) => new Date(e.timestamp) > since);
    const spikes = (telemetry.stressSpikes || []).filter((e) => new Date(e.timestamp) > since);
    const gameSessions = collectRecentGameSessions(priorReports);
    const avgArousal = vocalEvents.length
      ? +(vocalEvents.reduce((sum, event) => sum + (event.arousalScore || 5), 0) / vocalEvents.length).toFixed(1)
      : 5;

    const brief = await generateGuardianBrief({
      userName: patient.displayName || patient.userStateId,
      taskSummary: `${days}-day guardian clinical review`,
      blocker: execEvents.filter((e) => e.status === 'abandoned').length > execEvents.filter((e) => e.status === 'completed').length
        ? 'repeated freeze or task abandonment pattern'
        : 'mixed executive load with intermittent recovery',
      vocalArousal: avgArousal,
      emotion: avgArousal >= 7 ? 'high_anxiety' : avgArousal >= 5 ? 'mild_anxiety' : 'calm',
      baselineArousalScore: telemetry.baselineArousalScore || patient.patientIntake?.derivedScores?.overallBaseline || null,
      baselineProfile: telemetry.baselineProfile || {},
      patientIntake: patient.patientIntake || {},
      guardianIntake: guardianIntake || {},
      lastKnownActivity: user?.lastActive || null,
      worryBlocks: patient.privacyConsent?.rawWorrySharing === true
        ? normalizeWorryBlocks([], user?.vaultedWorries || [])
        : [],
      probeSessions: (telemetry.probeData || []).slice(-8),
      questTelemetry: execEvents.slice(-12),
      gameSessions,
      vocalStressEvents: vocalEvents.slice(-20),
      stressSpikes: spikes.slice(-10),
      guardianAlerts: alerts.slice(0, 10),
      auraAction: `Guardian requested an on-demand ${days}-day synthesized clinical report.`,
      recentPatterns: `${execEvents.length} task events, ${forgeEvents.length} forge sessions, ${gameSessions.length} game sessions, ${spikes.length} stress spikes, avg vocal arousal ${avgArousal}/10.`,
    });

    const report = await ClinicalReport.create({
      userId: patient.userStateId,
      patientId: patient._id,
      guardianId: guardian._id,
      dateRangeDays: days,
      source: 'manual',
      currentTask: `${days}-day guardian report`,
      selectedBlocker: 'multi-stream clinical synthesis',
      vocalArousalScore: avgArousal,
      initialAnxietyQuery: `Guardian on-demand report for ${patient.displayName}`,
      aiStressSummary: brief.executive_summary || '',
      aiBrief: brief,
      riskLevel: ['watch', 'pre-burnout', 'acute-distress'].includes(brief.risk_level) ? brief.risk_level : 'watch',
      shatteredWorryBlocks: patient.privacyConsent?.rawWorrySharing === true ? normalizeWorryBlocks([], user?.vaultedWorries || []) : [],
      gameSessions,
      patientIntakeSnapshot: patient.patientIntake || {},
      guardianIntakeSnapshot: guardianIntake || {},
      guardian: {
        name: guardian.displayName,
        email: guardian.email,
        relation: 'guardian',
      },
      meta: {
        notes: `${days}-day guardian dynamic report. Patient consent raw worries: ${patient.privacyConsent?.rawWorrySharing === true}.`,
        generatedAt: new Date(),
        gameSessions,
      },
    });

    res.json({
      success: true,
      reportId: report._id.toString(),
      riskLevel: report.riskLevel,
      aiStressSummary: report.aiStressSummary,
      brief,
      downloadUrl: buildPublicReportUrl(req, report._id.toString()),
    });
  } catch (err) {
    next(err);
  }
};

export const getDashboardMetricsHandler = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;
    if (!userId) throw new AppError('userId is required.', 400);

    const user = await UserState.findOne({ userId }).lean();
    if (!user) return res.json({ success: true, empty: true });

    const since    = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const telemetry = user.clinicalTelemetry || {};

    // ── Vocal Stress Index (daily average) ──────────────────────────────────
    const vocalRaw  = (telemetry.vocalStressEvents || []).filter(e => new Date(e.timestamp) > since);
    const vsiByDay  = _groupByDay(vocalRaw, e => e.arousalScore || 5, 'vsi');

    // ── Executive Function Score (completion ratio per day) ─────────────────
    const execRaw   = (telemetry.executiveFunction || []).filter(e => new Date(e.timestamp) > since);
    const execByDay = _groupByDayRatio(execRaw, 'efScore');

    // ── Forge Sessions (worry density per session) ───────────────────────────
    const forgeRaw  = (telemetry.forgeSessions || []).filter(e => new Date(e.timestamp) > since);
    const forgeByDay= _groupByDay(forgeRaw, e => e.worryDensity || 5, 'density');

    // ── Recent alert log ─────────────────────────────────────────────────────
    const alerts = await AlertLog.find({ userId }).sort({ sentAt: -1 }).limit(10).lean();

    // ── Summary stats ────────────────────────────────────────────────────────
    const stats = {
      tasksCompleted:  execRaw.filter(e => e.status === 'completed').length,
      tasksAbandoned:  execRaw.filter(e => e.status === 'abandoned').length,
      forgeSessions:   forgeRaw.length,
      avgVocalArousal: vocalRaw.length ? +(vocalRaw.reduce((s,e) => s + (e.arousalScore||5), 0) / vocalRaw.length).toFixed(1) : 0,
      stressSpikes:    (telemetry.stressSpikes || []).filter(e => new Date(e.timestamp) > since).length,
    };

    res.json({
      success: true,
      userId,
      guardian: user.guardian || {},
      charts: { vsiByDay, execByDay, forgeByDay },
      stats,
      recentAlerts: alerts,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/clinical/therapy-brief ─────────────────────────────────────────
// Generates a 14-day summary clinical brief using LangChain.
export const generateTherapyBriefHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new AppError('userId is required.', 400);

    const user = await UserState.findOne({ userId }).lean();
    if (!user) throw new AppError('User not found.', 404);

    const since     = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const telemetry = user.clinicalTelemetry || {};

    const vocalEvents = (telemetry.vocalStressEvents || []).filter(e => new Date(e.timestamp) > since);
    const execEvents  = (telemetry.executiveFunction || []).filter(e => new Date(e.timestamp) > since);
    const forgeEvents = (telemetry.forgeSessions || []).filter(e => new Date(e.timestamp) > since);
    const spikes      = (telemetry.stressSpikes || []).filter(e => new Date(e.timestamp) > since);

    const highArousalSessions = vocalEvents.filter(e => (e.arousalScore || 0) >= 7);
    const avgArousal = vocalEvents.length
      ? (vocalEvents.reduce((s,e) => s+(e.arousalScore||5),0)/vocalEvents.length).toFixed(1)
      : 'N/A';

    const abandoned = execEvents.filter(e => e.status === 'abandoned');
    const completed = execEvents.filter(e => e.status === 'completed');

    const brief = await generateGuardianBrief({
      userName:       userId,
      taskSummary:    `14-day clinical review (${execEvents.length} task interactions)`,
      blocker:        abandoned.length > completed.length ? 'chronic task paralysis pattern' : 'intermittent executive function challenges',
      vocalArousal:   parseFloat(avgArousal) || 5,
      emotion:        highArousalSessions.length > 3 ? 'high_anxiety' : 'mild_anxiety',
      auraAction:     `Over 14 days: ${forgeEvents.length} Cognitive Forge sessions, ${spikes.length} stress spikes detected.`,
      recentPatterns: `${completed.length} tasks completed, ${abandoned.length} abandoned. Average vocal arousal: ${avgArousal}/10. ${forgeEvents.length} worry-offloading sessions. ${spikes.length} acute stress spikes.`,
    });

    res.json({
      success:    true,
      generatedAt: new Date().toISOString(),
      period:      '14 days',
      brief,
      rawStats: {
        vocalSessions:     vocalEvents.length,
        highArousal:       highArousalSessions.length,
        avgArousal,
        tasksCompleted:    completed.length,
        tasksAbandoned:    abandoned.length,
        forgeSessions:     forgeEvents.length,
        stressSpikes:      spikes.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
// POST /api/clinical/session-report
// Generates a one-page session report PDF + optional guardian dispatch.
export const generateSessionReportHandler = async (req, res, next) => {
  try {
    const {
      userId,
      source = 'manual',
      taskId,
      currentTask,
      selectedBlocker,
      vocalArousalScore,
      initialAnxietyQuery,
      aiStressSummary,
      sendToGuardian = false,
      channels = { whatsapp: true, email: true },
      sessionSnapshot = {},
    } = req.body || {};

    if (!userId) throw new AppError('userId is required.', 400);

    const user = await UserState.findOrCreate(userId);
    const activeTask = taskId
      ? (user.taskHistory || []).find((t) => t.id === taskId)
      : (user.taskHistory || []).find((t) => t.status === 'active');

    const resolvedTask = toSafeString(
      currentTask || activeTask?.originalTask || sessionSnapshot?.currentTask || '',
      500
    );
    const resolvedBlocker = toSafeString(
      selectedBlocker || activeTask?.blocker || sessionSnapshot?.selectedBlocker || '',
      200
    );
    const resolvedArousal = Math.min(10, Math.max(1, Number(vocalArousalScore) || 5));

    let brief;
    if (aiStressSummary) {
      brief = {
        subject: `[${resolvedArousal >= 8 ? 'ACUTE' : 'WATCH'}] Session Summary`,
        executive_summary: toSafeString(aiStressSummary, 700),
        somatic_biological_markers: `Arousal level: ${resolvedArousal}/10.`,
        cognitive_rigidity_focus: 'Data derived from manual input summary.',
        actionable_protocol: 'Continue monitoring according to standard care plan.',
        analogy: 'A system under sustained load.',
        risk_level: resolvedArousal >= 8 ? 'acute-distress' : resolvedArousal >= 6 ? 'pre-burnout' : 'watch',
      };
    } else {
      try {
        const telemetry = user.clinicalTelemetry || {};
        brief = await generateGuardianBrief({
          userName: userId,
          taskSummary: resolvedTask || 'general stress event',
          blocker: resolvedBlocker || 'overwhelm',
          vocalArousal: resolvedArousal,
          emotion: resolvedArousal >= 8 ? 'high_anxiety' : 'mild_anxiety',
          baselineArousalScore: telemetry.baselineArousalScore || sessionSnapshot?.baselineArousalScore || null,
          baselineProfile: telemetry.baselineProfile || sessionSnapshot?.baselineProfile || {},
          lastKnownActivity: sessionSnapshot?.lastKnownActivity || null,
          worryBlocks: sessionSnapshot?.shatteredWorryBlocks || normalizeWorryBlocks([], user.vaultedWorries || []),
          probeSessions: (telemetry.probeData || []).slice(-5).concat(sessionSnapshot?.probeSessions || []),
          questTelemetry: sessionSnapshot?.timelineMicroquests || [],
          gameSessions: sessionSnapshot?.gameSessions || [],
          auraAction: 'Somatic regulation and guided breakdown interventions were used.',
          recentPatterns: 'Session-level snapshot report requested by the user.',
        });
      } catch (e) {
        console.error('[Clinical] generateGuardianBrief failed:', e.message);
        brief = {
          subject: '[WATCH] Session Summary',
          executive_summary: 'The session indicates elevated cognitive load and executive friction.',
          somatic_biological_markers: `Vocal arousal estimate: ${resolvedArousal}/10.`,
          cognitive_rigidity_focus: 'Slight decline in reaction times noted.',
          actionable_protocol: 'Reduce demands briefly, validate effort, then suggest one tiny next step.',
          analogy: 'A browser with too many active tabs.',
          risk_level: resolvedArousal >= 8 ? 'acute-distress' : resolvedArousal >= 6 ? 'pre-burnout' : 'watch',
        };
      }
    }

    const report = await ClinicalReport.create({
      userId,
      source: ['panic', 'manual', 'auto'].includes(source) ? source : 'manual',
      currentTask: resolvedTask,
      selectedBlocker: resolvedBlocker,
      vocalArousalScore: resolvedArousal,
      initialAnxietyQuery: toSafeString(initialAnxietyQuery || sessionSnapshot?.initialAnxietyQuery || '', 3000),
      aiStressSummary: toSafeString(brief.executive_summary || brief.observed_pattern || aiStressSummary || '', 2500),
      aiBrief: brief,
      riskLevel: ['watch', 'pre-burnout', 'acute-distress'].includes(brief.risk_level)
        ? brief.risk_level
        : 'watch',
      shatteredWorryBlocks: normalizeWorryBlocks(sessionSnapshot?.shatteredWorryBlocks, user.vaultedWorries || []),
      timelineMicroquests: normalizeTimeline(sessionSnapshot?.timelineMicroquests, activeTask || null),
      guardian: {
        name: toSafeString(user.guardian?.name, 120),
        email: toSafeString(user.guardian?.email, 200),
        phone: toSafeString(user.guardian?.phone, 30),
        relation: toSafeString(user.guardian?.relation, 80),
      },
      meta: {
        notes: toSafeString(sessionSnapshot?.notes, 1000),
        generatedAt: new Date(),
      },
    });

    const downloadUrl = buildPublicReportUrl(req, report._id.toString());
    // Fetch recent mood logs to include in PDF
    const patientMood = report.patientId
      ? await Patient.findById(report.patientId).select('dailyMoodLogs').lean()
      : await Patient.findOne({ userStateId: userId }).select('dailyMoodLogs').lean();
    const moodLogsForPdf = (patientMood?.dailyMoodLogs || [])
      .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt))
      .slice(0, 14)
      .reverse()
      .map((l) => ({ day: new Date(l.loggedAt).toISOString().slice(0, 10), battery: l.battery, brainFog: l.brainFog, anxiety: l.anxiety, energy: l.energy, sociability: l.sociability }));
    const pdfBuffer = await buildClinicalReportPdfBuffer(report.toObject(), moodLogsForPdf);

    let whatsappResult = { skipped: true, channel: 'whatsapp' };
    let emailResult = { skipped: true, channel: 'email' };

    if (sendToGuardian) {
      const guardianPhone = report.guardian?.phone || '';
      const guardianEmail = report.guardian?.email || '';

      const shouldWhatsApp = Boolean(channels?.whatsapp !== false);
      const shouldEmail = Boolean(channels?.email !== false);

      const mediaBase = process.env.TWILIO_MEDIA_PUBLIC_BASE_URL || process.env.REPORT_PUBLIC_BASE_URL || null;
      const mediaUrl = mediaBase
        ? `${mediaBase.replace(/\/$/, '')}/api/clinical/session-report/${report._id.toString()}/pdf`
        : null;

      const [waSettled, emailSettled] = await Promise.allSettled([
        shouldWhatsApp
          ? sendGuardianAlert({
              brief,
              userName: userId,
              guardianPhone,
              channel: user.guardian?.alertPreference || 'whatsapp',
              mediaUrl,
            })
          : Promise.resolve({ skipped: true, channel: 'whatsapp' }),
        shouldEmail
          ? sendGuardianReportEmail({
              to: guardianEmail,
              guardianName: report.guardian?.name,
              userId,
              riskLevel: report.riskLevel,
              reportId: report._id.toString(),
              summary: report.aiStressSummary,
              downloadUrl,
              pdfBuffer,
            })
          : Promise.resolve({ skipped: true, channel: 'email' }),
      ]);

      whatsappResult = waSettled.status === 'fulfilled'
        ? waSettled.value
        : { success: false, channel: 'whatsapp', error: waSettled.reason?.message || 'WhatsApp dispatch failed' };

      emailResult = emailSettled.status === 'fulfilled'
        ? emailSettled.value
        : { success: false, channel: 'email', error: emailSettled.reason?.message || 'Email dispatch failed' };

      await AlertLog.create({
        userId,
        guardianPhone: report.guardian?.phone || null,
        guardianEmail: report.guardian?.email || null,
        channel: whatsappResult.mock ? 'mock' : (whatsappResult.success ? 'whatsapp' : (emailResult.success ? 'email' : 'mock')),
        riskLevel: report.riskLevel,
        triggerReason: `${report.selectedBlocker || 'stress'} during "${report.currentTask || 'session'}"`,
        briefText: [brief.executive_summary, brief.actionable_protocol].join('\n\n').slice(0, 3000),
        deliveryStatus: whatsappResult.success || emailResult.success
          ? (whatsappResult.mock && emailResult.mock ? 'mock' : 'sent')
          : 'failed',
        twilioSid: whatsappResult.sid || null,
      });
    }

    report.delivery = {
      whatsapp: deliveryStatusFromResult(whatsappResult),
      email: deliveryStatusFromResult(emailResult),
    };
    await report.save();

    res.json({
      success: true,
      reportId: report._id.toString(),
      riskLevel: report.riskLevel,
      aiStressSummary: report.aiStressSummary,
      downloadUrl,
      delivery: report.delivery,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/clinical/session-report/:reportId/pdf
// Streams the generated report PDF for manual download.
export const downloadSessionReportPdfHandler = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    if (!reportId) throw new AppError('reportId is required.', 400);

    const report = await ClinicalReport.findById(reportId).lean();
    if (!report) throw new AppError('Report not found.', 404);

    // Fetch recent mood logs to hydrate the PDF
    const patientMood = report.patientId
      ? await Patient.findById(report.patientId).select('dailyMoodLogs').lean()
      : await Patient.findOne({ userStateId: report.userId }).select('dailyMoodLogs').lean();
    const moodLogsForPdf = (patientMood?.dailyMoodLogs || [])
      .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt))
      .slice(0, 14)
      .reverse()
      .map((l) => ({ day: new Date(l.loggedAt).toISOString().slice(0, 10), battery: l.battery, brainFog: l.brainFog, anxiety: l.anxiety, energy: l.energy, sociability: l.sociability }));

    const pdfBuffer = await buildClinicalReportPdfBuffer(report, moodLogsForPdf);

    await ClinicalReport.updateOne(
      { _id: reportId },
      { $inc: { 'meta.pdfDownloads': 1 } }
    );

    const filename = `AuraOS-Clinical-Report-${report.userId || 'user'}-${reportId}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });
    res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
function _groupByDay(events, valueFn, key) {
  const map = {};
  events.forEach(e => {
    const day = new Date(e.timestamp).toISOString().split('T')[0];
    if (!map[day]) map[day] = { day, sum: 0, count: 0 };
    map[day].sum += valueFn(e);
    map[day].count += 1;
  });
  return Object.values(map)
    .map(d => ({ day: d.day, [key]: +(d.sum / d.count).toFixed(1) }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function _groupByDayRatio(events, key) {
  const map = {};
  events.forEach(e => {
    const day = new Date(e.timestamp).toISOString().split('T')[0];
    if (!map[day]) map[day] = { day, completed: 0, total: 0 };
    map[day].total += 1;
    if (e.status === 'completed') map[day].completed += 1;
  });
  return Object.values(map)
    .map(d => ({
      day: d.day,
      [key]: d.total ? +(d.completed / d.total * 100).toFixed(0) : 0,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
