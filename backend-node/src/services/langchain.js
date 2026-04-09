// src/services/langchain.js  🌟 UPDATED
// Two AI personas live here:
//   1. breakdownTask — original micro-quest generator (unchanged)
//   2. coachBreakdown — Aura Initiation Coach (NEW: accepts blocker context)
//   3. generateGuardianBrief — Medical Analogy Report for parents/therapists (NEW)

import { ChatGroq } from '@langchain/groq';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

/* ─────────────────────────────────────────────────────────────
   SCHEMA 1 (original) — standard micro-quest list
   Used by: breakdownTask()
──────────────────────────────────────────────────────────────*/
const MicroQuestSchema = z.object({
  microquests: z
    .array(
      z.object({
        id:               z.number().int().min(1),
        action:           z.string().max(200).describe('Imperative, 2-minute physical action.'),
        tip:              z.string().max(200).describe('Warm, ADHD-friendly encouragement ≤20 words.'),
        duration_minutes: z.number().min(1).max(5).default(2),
      })
    )
    .min(2)
    .max(8),
});

/* ─────────────────────────────────────────────────────────────
   SCHEMA 2 (NEW) — Initiation Coach with env strategy
   Used by: coachBreakdown()
──────────────────────────────────────────────────────────────*/
const InitiationCoachSchema = z.object({
  coach_message: z.string().max(280).describe(
    'A 2-sentence empathetic message acknowledging their SPECIFIC blocker and confirming the environment action taken.'
  ),
  environment_strategy: z
    .enum(['brown_noise', 'deep_focus_dark', 'meditation_first', 'none'])
    .describe(
      'brown_noise → distracted/noisy; deep_focus_dark → brain fog/exhaustion; meditation_first → acute overwhelm; none → mild.'
    ),
  microquests: z
    .array(
      z.object({
        id:               z.string().describe('Unique string id e.g. "step-1"'),
        text:             z.string().max(200).describe('Imperative, ultra-specific 2-minute action.'),
        tip:              z.string().max(180).describe('Warm 1-sentence ADHD tip.'),
        duration_minutes: z.number().min(1).max(5).default(2),
        colorId:          z.enum(['cyan', 'purple', 'coral', 'amber', 'green'])
                           .describe('Difficulty signal: cyan=easy, amber=medium, coral=hard'),
      })
    )
    .min(3)
    .max(6),
});

/* ─────────────────────────────────────────────────────────────
   SCHEMA 3 (NEW) — Guardian Medical Brief
   Used by: generateGuardianBrief()
──────────────────────────────────────────────────────────────*/
const GuardianBriefSchema = z.object({
  subject:              z.string().max(120).describe('Email/SMS subject line.'),
  analogy:              z.string().max(300).describe(
    'A single, powerful non-clinical metaphor describing the cognitive state (e.g., "computer with 40 tabs open").'
  ),
  vocal_analysis:       z.string().max(200).describe('1–2 sentences on vocal stress markers.'),
  observed_pattern:     z.string().max(400).describe(
    '2–3 sentences on what the user was struggling with and the behavioural pattern detected.'
  ),
  aura_action_taken:    z.string().max(250).describe(
    'What the AuraOS system did (somatic interruption, brown noise, coach message).'
  ),
  parent_action:        z.string().max(300).describe(
    'Specific, warm phrases and actions for the parent/guardian to use right now. NOT clinical jargon.'
  ),
  risk_level:           z.enum(['watch', 'pre-burnout', 'acute-distress'])
                          .describe('Clinical triage level.'),
});

/* ─────────────────────────────────────────────────────────────
   GROQ CLIENT FACTORY
──────────────────────────────────────────────────────────────*/
const makeModel = (schema, name) => {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set.');
  const llm = new ChatGroq({
    model:       process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    temperature: 0.4,
    apiKey:      process.env.GROQ_API_KEY,
  });
  return llm.withStructuredOutput(schema, { name, strict: true });
};

/* ─────────────────────────────────────────────────────────────
   PROMPTS
──────────────────────────────────────────────────────────────*/
const STANDARD_SHATTER_PROMPT = `You are an ADHD executive function coach embedded in AuraOS.
Your user is experiencing task paralysis. Atomize the given task into the SMALLEST possible micro-steps.
RULES:
1. Each step = one tiny physical action completable in ~2 minutes.
2. Start with the absolute easiest first action.
3. No technical jargon.
4. Each "action" is an imperative sentence (verb first).
5. Each "tip" is warm and encouraging (≤20 words).
6. Max 8 steps. Break only the FIRST phase if the task is large.`;

const INITIATION_COACH_PROMPT = `You are the Aura Initiation Coach — a neuro-inclusive AI partner for someone with ADHD/Anxiety.
The user told you their specific neurological blocker. Use it to personalise EVERYTHING.

ENVIRONMENT STRATEGY RULES:
- brown_noise → user is in a noisy/distracting environment
- deep_focus_dark → brain fog, fatigue, or cognitive overload
- meditation_first → acute overwhelm (task feels too big/scary), used ONLY when blocker is "too_overwhelming"
- none → mild frustration only

COACH MESSAGE RULES:
- Start with "I hear you." or "Got it." to confirm you received their blocker.
- Confirm what environment action you are triggering.
- Keep it under 2 sentences. Warm but efficient.

MICROQUEST RULES:
- Colour signal: first step = 'cyan' (easiest), escalate to 'amber' mid-way, never 'coral' for first 2 steps.
- Each action is a single physical verb sentence. Ultra specific.
- Tip is ≤1 sentence. Sounds like a supportive friend, not a robot.`;

const GUARDIAN_BRIEF_PROMPT = `You are the AuraOS Clinical Intelligence Layer generating a Professional Guardian Triage Brief.
This is sent to a parent, therapist, or school counselor when a stress spike is detected.

TONE: Clinical authority + human warmth. NOT cold. NOT patronising.
LANGUAGE: Accessible metaphors. Avoid raw medical jargon.
PARENT_ACTION: Give specific, phraseable sentences the parent can literally say to the child right now.
RISK_LEVEL: Use 'watch' for mild stress, 'pre-burnout' for sustained high load, 'acute-distress' for acute crisis.
Do NOT reveal app mechanics (no "the AI did X"). Frame all Aura actions as "the support system intervened."`;

/* ─────────────────────────────────────────────────────────────
   EXPORT 1 — Standard task breakdown (unchanged API)
──────────────────────────────────────────────────────────────*/
export const breakdownTask = async (task) => {
  if (!task?.trim()) throw new Error('Task is required.');
  const model = makeModel(MicroQuestSchema, 'generate_microquests');
  console.log(`[LangChain] Standard breakdown: "${task.substring(0, 80)}"`);
  const result = await model.invoke([
    new SystemMessage(STANDARD_SHATTER_PROMPT),
    new HumanMessage(`Break this into micro-quests: "${task}"`),
  ]);
  return result.microquests;
};

/* ─────────────────────────────────────────────────────────────
   EXPORT 2 (🌟 NEW) — Coach-aware breakdown with env strategy
──────────────────────────────────────────────────────────────*/
export const coachBreakdown = async (task, blocker) => {
  if (!task?.trim()) throw new Error('Task is required.');
  const model = makeModel(InitiationCoachSchema, 'initiation_coach');
  const blockerLabel = blocker || 'not specified';
  console.log(`[LangChain] Coach breakdown: "${task.substring(0,60)}" | blocker: ${blockerLabel}`);
  const result = await model.invoke([
    new SystemMessage(INITIATION_COACH_PROMPT),
    new HumanMessage(
      `Task to shatter: "${task}"\nUser's neurological blocker: "${blockerLabel}"\nGenerate the coach response and micro-quests now.`
    ),
  ]);
  return result;
};

/* ─────────────────────────────────────────────────────────────
   EXPORT 3 (🌟 NEW) — Guardian Medical Analogy Brief
──────────────────────────────────────────────────────────────*/
export const generateGuardianBrief = async ({
  userName,
  taskSummary,
  blocker,
  vocalArousal,
  emotion,
  auraAction,
  recentPatterns,  // short text summary of last 24h behaviour
}) => {
  const model = makeModel(GuardianBriefSchema, 'guardian_brief');

  const contextBlock = `
User name: ${userName || 'the user'}
Task they were attempting: "${taskSummary || 'unspecified task'}"
Stated blocker: "${blocker || 'overwhelming feelings'}"
Vocal arousal score (1-10): ${vocalArousal || 'N/A'}
Detected emotion: ${emotion || 'high_anxiety'}
Action taken by AuraOS: ${auraAction || 'Somatic interruption (breathing exercise) deployed.'}
Recent 24h pattern: ${recentPatterns || 'User has been working on stressful tasks with elevated vocal arousal.'}
`.trim();

  console.log(`[LangChain] Generating Guardian Brief for user: ${userName}`);
  const result = await model.invoke([
    new SystemMessage(GUARDIAN_BRIEF_PROMPT),
    new HumanMessage(`Generate the Guardian Triage Brief for this situation:\n\n${contextBlock}`),
  ]);
  return result;
};