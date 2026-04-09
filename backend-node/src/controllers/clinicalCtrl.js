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
import AlertLog    from '../models/AlertLog.js';
import { generateGuardianBrief } from '../services/langchain.js';
import { sendGuardianAlert }     from '../services/twilio.js';
import { evaluateBurnoutRisk }   from '../services/triageEngine.js';
import { AppError }              from '../middleware/errorHandler.js';

// ── POST /api/clinical/trigger-alert ─────────────────────────────────────────
// Called when the user selects "Too overwhelming" in the Initiation Coach.
// Simultaneously: generates brief → sends Twilio → logs telemetry spike.
export const triggerAlertHandler = async (req, res, next) => {
  try {
    const { userId, taskSummary, blocker, vocalArousal, emotion } = req.body;
    if (!userId) throw new AppError('userId is required.', 400);

    const user = await UserState.findOrCreate(userId);

    // Build the context for the AI brief
    const recentExec = (user.clinicalTelemetry?.executiveFunction || [])
      .slice(-10)
      .map(e => `${e.status} "${e.taskSummary || 'task'}"`)
      .join(', ');

    const recentForge = (user.clinicalTelemetry?.forgeSessions || [])
      .slice(-5).length;

    const recentPattern = `${recentExec || 'No recent task history'}.${recentForge ? ` Used Cognitive Forge ${recentForge} times recently.` : ''}`;

    // Generate Guardian Brief via LangChain
    let brief;
    try {
      brief = await generateGuardianBrief({
        userName:        userId, // replace with user.name when auth exists
        taskSummary:     taskSummary || 'an overwhelming task',
        blocker:         blocker || 'too_overwhelming',
        vocalArousal:    vocalArousal || 8,
        emotion:         emotion || 'high_anxiety',
        auraAction:      'Somatic interruption (5-second breathing exercise) deployed. Brown noise environment activated.',
        recentPatterns:  recentPattern,
      });
    } catch (aiErr) {
      console.warn('[Clinical] LangChain brief generation failed, using fallback.', aiErr.message);
      // Graceful fallback so Twilio still fires
      brief = {
        subject:            `AuraOS Alert — Stress Spike Detected`,
        analogy:            'A computer that has frozen because too many programmes tried to run at once.',
        vocal_analysis:     `Vocal arousal detected at ${vocalArousal || 8}/10 — significantly elevated.`,
        observed_pattern:   `The user attempted "${taskSummary}" but reported acute overwhelm. This is consistent with executive dysfunction freeze.`,
        aura_action_taken:  'A breathing exercise was deployed and a calming audio environment was activated.',
        parent_action:      'Do not ask about the task for at least 20 minutes. Offer water and a brief walk. Use the phrase: "I see you are working really hard. Let\'s take a break together."',
        risk_level:         'pre-burnout',
      };
    }

    // Log telemetry spike to DB
    user.clinicalTelemetry.stressSpikes.push({
      trigger:      taskSummary || 'unknown task',
      vocalArousal: vocalArousal || 8,
      emotion:      emotion || 'high_anxiety',
      blocker:      blocker || 'too_overwhelming',
      briefSummary: brief.observed_pattern?.slice(0, 1000),
    });
    await user.save();

    // Send Twilio alert
    const guardianPhone = user.guardian?.phone;
    const channel       = user.guardian?.alertPreference || 'whatsapp';
    const deliveryResult = await sendGuardianAlert({
      brief,
      userName:     userId,
      guardianPhone,
      channel,
    });

    // Update spike with alert status
    const lastSpike = user.clinicalTelemetry.stressSpikes[user.clinicalTelemetry.stressSpikes.length - 1];
    if (lastSpike) {
      lastSpike.alertSent    = deliveryResult.success;
      lastSpike.alertChannel = deliveryResult.channel;
      await user.save();
    }

    // Log to AlertLog collection
    await AlertLog.create({
      userId,
      guardianPhone:  guardianPhone || null,
      channel:        deliveryResult.channel,
      riskLevel:      brief.risk_level,
      triggerReason:  `${blocker} during "${taskSummary}"`,
      briefText:      [brief.observed_pattern, brief.parent_action].join('\n\n').slice(0, 3000),
      deliveryStatus: deliveryResult.mock ? 'mock' : (deliveryResult.success ? 'sent' : 'failed'),
      twilioSid:      deliveryResult.sid || null,
    });

    res.json({
      success:        true,
      briefGenerated: true,
      alertSent:      deliveryResult.success,
      channel:        deliveryResult.channel,
      riskLevel:      brief.risk_level,
      coachFeedback:  brief.analogy, // shown on-screen to user as gentle reassurance
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

    // Background triage check (non-blocking)
    evaluateBurnoutRisk(userId).then(async (risk) => {
      if (risk.atRisk && risk.riskLevel === 'acute-distress') {
        // Auto-alert without user intervention for severe cases
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
    user.guardian = { name, email, phone, relation, alertPreference, reportFrequency, linkedAt: new Date() };
    await user.save();

    res.json({ success: true, guardian: user.guardian });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/clinical/dashboard/:userId ───────────────────────────────────────
// Returns recharts-ready arrays for the Observer Portal.
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
function _groupByDay(events, valueFn, key) {
  const map = {};
  events.forEach(e => {
    const day = new Date(e.timestamp).toISOString().split('T')[0];
    if (!map[day]) map[day] = { day, sum: 0, count: 0 };
    map[day].sum   += valueFn(e);
    map[day].count += 1;
  });
  return Object.values(map).map(d => ({ day: d.day, [key]: +(d.sum / d.count).toFixed(1) })).sort((a,b) => a.day.localeCompare(b.day));
}

function _groupByDayRatio(events, key) {
  const map = {};
  events.forEach(e => {
    const day = new Date(e.timestamp).toISOString().split('T')[0];
    if (!map[day]) map[day] = { day, completed: 0, total: 0 };
    map[day].total += 1;
    if (e.status === 'completed') map[day].completed += 1;
  });
  return Object.values(map).map(d => ({
    day:   d.day,
    [key]: d.total ? +(d.completed / d.total * 100).toFixed(0) : 0,
  })).sort((a,b) => a.day.localeCompare(b.day));
}