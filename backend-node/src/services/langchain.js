// src/services/langchain.js — Optimized v4.0 (OpenRouter Engine)

import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ── Schemas (ADHD & Clinical Recovery) ────────────────────────────────── */

/* ── Schemas ────────────────────────────── */
const MicroQuestSchema = z.object({
  microquests: z.array(z.object({
    id:               z.number().int().min(1),
    action:           z.string().max(200),
    tip:              z.string().max(180),
    duration_minutes: z.number().min(1).max(5).default(2),
  })).min(2).max(8),
});

const InitiationCoachSchema = z.object({
  coach_message: z.string().max(260),
  environment_strategy: z.enum(['brown_noise', 'deep_focus_dark', 'meditation_first', 'none']),
  microquests: z.array(z.object({
    id:               z.string(),
    text:             z.string().max(180),
    tip:              z.string().max(160),
    duration_minutes: z.number().min(1).max(5).default(2),
    colorId:          z.enum(['cyan', 'purple', 'coral', 'amber', 'green']),
  })).min(3).max(6),
});

const GuardianBriefSchema = z.object({
  subject:           z.string().max(110).describe('WhatsApp/SMS subject line with risk emoji.'),
  executive_summary: z.string().describe('Clinically profound high-level overview of the session state.'),
  intake_correlations: z.string().describe('Specific synthesis of patient intake and guardian observational intake.'),
  telemetry_correlations: z.string().describe('Specific cross-stream correlations across intake, games, acoustic arousal, worries, and task events.'),
  somatic_biological_markers: z.string().describe('Analysis of vocal arousal, heart rate variability (if available), and biological stress signals.'),
  cognitive_rigidity_focus: z.string().describe('Deep analysis of game latency, accuracy, and executive function markers (e.g. spatial sorting errors).'),
  actionable_protocol: z.string().describe('Clear, step-by-step clinical protocol for the guardian including specific dialogue scripts.'),
  guardian_protocol: z.string().describe('Guardian-facing next actions grounded in the patient and guardian intake correlation.'),
  patient_strengths: z.string().describe('Protective factors and strengths inferred from telemetry without exaggeration.'),
  activity_analysis: z.string().describe('Detailed activity diagnostics: For each attempted activity (even 1s or 1h), state the duration, success rate, and a detailed neuroscience reason why they might have succeeded, failed, or abandoned it.'),
  analogy:           z.string().max(300).describe('ONE powerful non-clinical metaphor grounded in data.'),
  risk_level:        z.enum(['watch', 'pre-burnout', 'acute-distress']).describe('Clinical risk triage.'),
});

/* ── OpenRouter client factory ───────────────────────────────────────────── */
const makeModel = (schema, name, temp = 0.38) => {
  try {
    const groqKey = process.env.GROQ_API_KEY_SHATTER || process.env.GROQ_API_KEY;
    const useGroq = !!groqKey;
    const apiKey = useGroq ? groqKey : process.env.OPENROUTER_API_KEY; 
    if (!apiKey) throw new Error('API_KEY is not set.');
    
    const llm = new ChatOpenAI({
      modelName: useGroq ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant') : (process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'),
      temperature: temp,
      apiKey: apiKey,
      configuration: {
        baseURL: useGroq ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'AuraOS',
        }
      }
    });
    return llm.withStructuredOutput(schema, { name, strict: true });
  } catch (err) {
    console.warn('[LangChain] Model init failed:', err.message);
    return null;
  }
};

const fallbackMicroquests = (task) => {
  const subject = String(task || 'this task').trim().slice(0, 80) || 'this task';
  return [
    { id: 1, action: `Open the place where you will work on: ${subject}.`, tip: 'Just arrive at the workspace.', duration_minutes: 2 },
    { id: 2, action: 'Write the smallest visible next action in one sentence.', tip: 'Tiny and concrete wins here.', duration_minutes: 2 },
    { id: 3, action: 'Do that one next action for two minutes.', tip: 'Stop after two minutes if needed.', duration_minutes: 2 },
  ];
};

const fallbackGuardianBrief = (data = {}) => {
  const arousal = Number(data.vocalArousal) || 5;
  const riskLevel = arousal >= 8 ? 'acute-distress' : arousal >= 6 ? 'pre-burnout' : 'watch';
  const task = data.taskSummary || 'the current session';
  return {
    subject: `AuraOS ${riskLevel} summary`,
    executive_summary: `The session around "${task}" shows ${riskLevel} level load with vocal arousal estimated at ${arousal}/10.`,
    intake_correlations: 'Intake correlation requires linked patient and guardian intake data.',
    telemetry_correlations: data.recentPatterns || 'No recent telemetry pattern was available.',
    somatic_biological_markers: `Vocal arousal was estimated at ${arousal}/10 with emotion "${data.emotion || 'unknown'}".`,
    cognitive_rigidity_focus: 'Task and game telemetry were limited, so cognitive rigidity should be interpreted cautiously.',
    activity_analysis: 'Activity analysis is based on the provided session snapshot and available task telemetry.',
    actionable_protocol: 'Lower the demand, validate the effort, and offer one concrete next step.',
    guardian_protocol: 'Say: "I can see this is heavy. Let us make the next step very small."',
    patient_strengths: 'The patient sought support and engaged with regulation tooling.',
    analogy: 'The session resembles a system under load that needs fewer active processes before continuing.',
    risk_level: riskLevel,
  };
};

/* ── Clinical Knowledge Ingestion ────────────────────────────────────────── */

const loadClinicalKnowledge = () => {
  try {
    const kbDir = path.join(__dirname, '../clinical_knowledge');
    if (!fs.existsSync(kbDir)) return '';
    const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.txt'));
    let combinedContext = '';
    for (const file of files) {
      combinedContext += `[Source: ${file}]\n${fs.readFileSync(path.join(kbDir, file), 'utf-8')}\n\n`;
    }
    return combinedContext;
  } catch (e) {
    return '';
  }
};

/* ── System Prompts ────────────────────────────────────────────────────────── */

const STANDARD_SHATTER_PROMPT = `You are an ADHD executive function coach embedded in AuraOS.
The user is experiencing task paralysis. Your ONLY job: atomize their EXACT task into the SMALLEST possible steps.

ABSOLUTE RULES — VIOLATION = FAILURE:
1. NEVER generate coping mechanisms, therapy advice, breathing exercises, mindfulness tips, or emotional support.
2. NEVER suggest "take a break", "drink water", "go for a walk", or any self-care step.
3. ONLY output concrete, physical steps to complete the user's SPECIFIC task.
4. Step 1 MUST reference the user's actual task noun (e.g. if task = "build backend", step 1 = "Open your code editor and create a new folder called 'backend'").
5. Each step = ONE single physical action completable in ~2 minutes.
6. Start EVERY action with a strong imperative verb (Open, Type, Click, Write, Run, Create, Navigate, Copy, Paste).
7. Tips must sound human and warm, ≤18 words. Tips should be about the TASK, not about feelings.
8. If the task is vague, make reasonable assumptions and be specific anyway.`;

const INITIATION_COACH_PROMPT = `You are the Aura Initiation Coach — a Principal Engineer and neuro-inclusive AI designed for clinical task unblocking.
The user selected a specific blocker. You MUST tailor the coaching and the task breakdown strictly to this blocker.

ABSOLUTE RULES — VIOLATION = FAILURE:
1. Every microquest MUST be a concrete physical action to complete the user's ACTUAL task. No therapy advice.
2. IF BLOCKER IS "too_noisy" (Sensory Overload):
   - Coach Message: Acknowledge external noise/distraction. Inform them acoustic masking (Brown Noise) is active.
   - Microquests: Step 1 MUST focus on environment control (e.g., "Put on headphones", "Close your door"). Step 2 onwards must break down the task normally.
3. IF BLOCKER IS "brain_fog" (Cognitive Fatigue):
   - Coach Message: Acknowledge internal energy depletion. Inform them optical strain reduction (Dark Mode) is active.
   - Microquests: The breakdown must be ATOMIZED into ridiculously small, zero-cognitive-load steps. E.g., "Open the file", "Write one single sentence". No heavy planning allowed.
4. The coach_message is the ONLY place for empathy. Microquests = pure task execution.

ENVIRONMENT STRATEGY:
• brown_noise → noisy/distracted (Sensory Overload)
• deep_focus_dark → brain fog/fatigue (Cognitive Fatigue)
• meditation_first → acute overwhelm.
• none → mild friction.

MICROQUESTS: Step 1 MUST be cyan (easiest). Be hyper-specific to the user's task. Start with imperative verbs.`;

const GUARDIAN_BRIEF_PROMPT = `You are a Senior Medical Doctor in Neuroscience and Behavioral Health. You are writing a highly professional, clinical "Deep Diagnosis" session report for AuraOS.

MISSION:
Transform raw intake + guardian observations + live telemetry into profound clinical neuroscience insights. Do not just regurgitate data. Perform a deep, dynamic synthesis.
Example: Instead of "User got 4 errors in Color Sort," say "High error rates in spatial sorting combined with elevated vocal arousal suggest acute executive dysfunction and impulse control fatigue."
Required example style: "The guardian noted frequent night-time isolation, which correlates with the patient's severe cognitive rigidity scores in Perception Probe and elevated baseline stress intake."

STRUCTURED OUTPUT SECTIONS:
1. executive_summary: A synthesis of the patient's current neuropsychological state. Is this a state-based freeze or a trait-based burnout?
2. intake_correlations: Directly connect patient self-report with guardian observational MCQs. Use at least one "guardian noted X, patient reported Y" sentence when data exists.
3. telemetry_correlations: Directly connect intake + guardian observations to game latency/accuracy, worry density, acoustic arousal, and stress spikes.
4. somatic_biological_markers: Interpret vocal arousal (1-10) and acoustic stress markers. How does this correlate with the stated blocker?
5. cognitive_rigidity_focus: Analyze game performance (latency, accuracy). High latency in Perception Probe suggests cognitive inflexibility. Rhythm Sync variance suggests timing dysregulation. Spark Canvas hesitation suggests inhibition.
6. activity_analysis: Detailed diagnostics of EVERY activity the patient tried. State exactly how long they spent (e.g., 45 seconds, 1 hour), whether they completed/answered correctly, and provide a strict neuroscience/clinical reason why they succeeded, failed, or faced a blocker linked to that specific activity performance.
7. actionable_protocol / guardian_protocol: A precise behavioral protocol. Include exactly ONE direct quote for the guardian to say.
8. patient_strengths: Identify protective factors from completed tasks, regulation attempts, successful game signals, or help-seeking.
9. analogy: A data-grounded metaphor (e.g. "a CPU thermal throttling due to background task density").

STRICT DATA-GROUNDED RULES:
1. Reference SPECIFIC metrics: "Vocal arousal of 8/10", "1200ms latency", "40% accuracy".
2. Link somatic data to cognitive data. (e.g. "Elevated arousal correlated with increased reaction times across therapeutic games").
3. Never write static boilerplate. Every paragraph must cite at least one provided datapoint or explicitly state a missing datapoint.
4. Do not diagnose ADHD, panic disorder, depression, or PTSD. Use "consistent with", "suggests", or "may reflect".
5. TONE: High-level clinical authority + diagnostic precision.

STRICT RISK CLASSIFICATION:
- watch: Mild stress, resilient recovery.
- pre-burnout: Chronic sympathetic activation, declining executive performance.
- acute-distress: Immediate neurological shutdown / crisis state detected.`;

export const breakdownTask = async (task) => {
  const model = makeModel(MicroQuestSchema, 'generate_microquests');
  if (!model) return fallbackMicroquests(task);

  console.log(`[LangChain-OpenRouter] Standard breakdown...`);
  try {
    const result = await model.invoke([
      new SystemMessage(STANDARD_SHATTER_PROMPT),
      new HumanMessage(`Break this task into micro-steps: "${task}"`),
    ]);
    return result.microquests;
  } catch (err) {
    console.warn('[LangChain] Standard breakdown failed, using fallback:', err.message);
    return fallbackMicroquests(task);
  }
};

export const coachBreakdown = async (task, blocker) => {
  const model = makeModel(InitiationCoachSchema, 'initiation_coach');
  const fallback = () => ({
    coach_message: 'I will keep this concrete and small so you can start without extra planning.',
    environment_strategy: blocker === 'too_noisy' ? 'brown_noise' : blocker === 'brain_fog' ? 'deep_focus_dark' : 'none',
    microquests: fallbackMicroquests(task).map((q) => ({
      id: String(q.id),
      text: q.action,
      tip: q.tip,
      duration_minutes: q.duration_minutes,
      colorId: q.id === 1 ? 'cyan' : q.id === 2 ? 'purple' : 'green',
    })),
  });
  if (!model) return fallback();

  console.log(`[LangChain-OpenRouter] Coach breakdown...`);
  try {
    return await model.invoke([
      new SystemMessage(INITIATION_COACH_PROMPT),
      new HumanMessage(`Task: "${task}"\nBlocker: "${blocker || 'overwhelm'}"`),
    ]);
  } catch (err) {
    console.warn('[LangChain] Coach breakdown failed, using fallback:', err.message);
    return fallback();
  }
};

export const generateGuardianBrief = async (data) => {
  const model = makeModel(GuardianBriefSchema, 'guardian_brief', 0.42);
  if (!model) return fallbackGuardianBrief(data);

  // ── Build rich telemetry context block ───────────────────────────────
  const safe = (v, fallback = 'N/A') => (v !== undefined && v !== null && v !== '') ? v : fallback;
  const arousalLabel = Number(data.vocalArousal) >= 8 ? 'HIGH' : Number(data.vocalArousal) >= 6 ? 'ELEVATED' : Number(data.vocalArousal) >= 4 ? 'MODERATE' : 'LOW';

  // Baseline profile
  const bp = data.baselineProfile || {};
  const bpLines = Object.keys(bp).length
    ? Object.entries(bp).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    : '  Not completed.';

  // Worry blocks
  const worries = Array.isArray(data.worryBlocks) && data.worryBlocks.length
    ? data.worryBlocks.slice(0, 8).map(w => `  - "${w.text}" (weight: ${w.weight}/10, ${w.status})`).join('\n')
    : '  None extracted this session.';

  // Probe sessions (cognitive flexibility)
  const probes = Array.isArray(data.probeSessions) && data.probeSessions.length
    ? data.probeSessions.map(p => `  - Image: ${p.imageId}, First seen: ${p.firstSeen}, Latency: ${p.latencyMs}ms, Switched: ${p.canSwitchPerspective}`).join('\n')
    : '  Not assessed this session.';

  // Quest telemetry (shatter exertion / timeline)
  const quests = Array.isArray(data.questTelemetry) && data.questTelemetry.length
    ? data.questTelemetry.map(q => `  - ${q.action || q.questId || 'Task'}: ${q.durationMs || (q.duration_minutes ? q.duration_minutes * 60000 : '?')}ms, completed: ${q.completed}`).join('\n')
    : '  No micro-quest data.';

  // Game sessions
  const games = Array.isArray(data.gameSessions) && data.gameSessions.length
    ? data.gameSessions.map(g => `  - ${g.gameName || g.gameId}: ${g.durationSeconds}s, score ${g.score}, accuracy ${g.accuracy}%, reaction ${g.avgReactionMs}ms. ${g.predictedEffects?.clinicalNote || ''}`).join('\n')
    : '  No therapeutic games played.';

  const fmtAnswers = (intake, label) => {
    const scores = intake?.derivedScores ? Object.entries(intake.derivedScores).map(([k, v]) => `${k}: ${v}/10`).join(', ') : 'no derived scores';
    const answers = Array.isArray(intake?.answers) && intake.answers.length
      ? intake.answers.map(a => `  - ${a.label || a.id}: ${a.value}/4`).join('\n')
      : '  Not completed.';
    return `${label} derived scores: ${scores}\n${answers}`;
  };

  const vocalEvents = Array.isArray(data.vocalStressEvents) && data.vocalStressEvents.length
    ? data.vocalStressEvents.map(e => `  - ${e.arousalScore || '?'} /10 ${e.emotion || ''} during ${e.taskContext || 'unknown context'}`).join('\n')
    : '  No recent vocal events.';

  const spikes = Array.isArray(data.stressSpikes) && data.stressSpikes.length
    ? data.stressSpikes.map(s => `  - ${s.vocalArousal || '?'} /10 trigger "${s.trigger || 'unknown'}", blocker "${s.blocker || 'unknown'}"`).join('\n')
    : '  No recent stress spikes.';

  const guardianAlerts = Array.isArray(data.guardianAlerts) && data.guardianAlerts.length
    ? data.guardianAlerts.map(a => `  - ${a.riskLevel || 'watch'} via ${a.channel || 'unknown'}: ${a.triggerReason || 'alert event'}`).join('\n')
    : '  No guardian alerts in range.';

  const contextBlock = `
=== TELEMETRY PAYLOAD ===

PATIENT: ${safe(data.userName)}
CURRENT TASK: "${safe(data.taskSummary, 'unspecified')}"
BLOCKER: "${safe(data.blocker, 'none stated')}"
VOCAL AROUSAL: ${safe(data.vocalArousal)}/10 — ${arousalLabel}
DETECTED EMOTION: ${safe(data.emotion)}
LAST KNOWN ACTIVITY: ${safe(data.lastKnownActivity, 'Unknown')}
BASELINE AROUSAL (from intake): ${safe(data.baselineArousalScore)}

ONBOARDING BASELINE PROFILE:
${bpLines}

PATIENT 10-QUESTION INTAKE:
${fmtAnswers(data.patientIntake, 'Patient intake')}

GUARDIAN 5-QUESTION OBSERVATIONAL INTAKE:
${fmtAnswers(data.guardianIntake, 'Guardian intake')}

WORRY BLOCKS (Cognitive Forge):
${worries}

COGNITIVE FLEXIBILITY (Perception Probe):
${probes}

MICRO-QUEST EXERTION (Task Shatter):
${quests}

THERAPEUTIC GAME SESSIONS:
${games}

RECENT VOCAL STRESS EVENTS:
${vocalEvents}

CRISIS / SPIKE EVENTS:
${spikes}

GUARDIAN ALERT HISTORY:
${guardianAlerts}

AURA INTERVENTION: ${safe(data.auraAction, 'Somatic interruption deployed.')}
24H PATTERN: ${safe(data.recentPatterns, 'No historical pattern available.')}
`.trim();

  console.log(`[LangChain-OpenRouter] Guardian brief for: ${data.userName}`);
  try {
    return await model.invoke([
      new SystemMessage(GUARDIAN_BRIEF_PROMPT),
      new HumanMessage(`Generate the Guardian Triage Brief based ONLY on this telemetry:\n\n${contextBlock}`),
    ]);
  } catch (err) {
    console.warn('[LangChain] Guardian brief failed, using fallback:', err.message);
    return fallbackGuardianBrief(data);
  }
};
