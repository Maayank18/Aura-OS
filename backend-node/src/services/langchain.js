// // src/services/langchain.js — Optimized v2.0
// // Improved with neuroscience-backed prompts for ADHD/anxiety support
// // Research sources: Tiimo, Inflow, EndeavorOTC, Goblin.tools methodologies

// import { ChatGroq } from '@langchain/groq';
// import { z } from 'zod';
// import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// /* ── Schema 1: Standard micro-quest breakdown ──────────────────────────── */
// const MicroQuestSchema = z.object({
//   microquests: z.array(z.object({
//     id:               z.number().int().min(1),
//     action:           z.string().max(200).describe('Single imperative physical action, ~2 minutes. Start with an ACTION VERB.'),
//     tip:              z.string().max(180).describe('One warm, ADHD-friendly encouragement ≤18 words. No toxic positivity.'),
//     duration_minutes: z.number().min(1).max(5).default(2),
//   })).min(2).max(8),
// });

// /* ── Schema 2: Initiation Coach (blocker-aware) ────────────────────────── */
// const InitiationCoachSchema = z.object({
//   coach_message: z.string().max(260).describe(
//     '2 sentences MAX. Sentence 1: acknowledge their exact blocker with empathy. Sentence 2: confirm the environment action AuraOS is taking.'
//   ),
//   environment_strategy: z.enum(['brown_noise', 'deep_focus_dark', 'meditation_first', 'none']).describe(
//     'brown_noise = noisy/distracted; deep_focus_dark = brain fog/tired; meditation_first = overwhelmed/frozen; none = mild friction only.'
//   ),
//   microquests: z.array(z.object({
//     id:               z.string().describe('Unique step ID, e.g. "step-1"'),
//     text:             z.string().max(180).describe('Ultra-specific 2-minute action. Start with an ACTION VERB. Mention tools/apps by name when relevant.'),
//     tip:              z.string().max(160).describe('1-sentence warm ADHD tip. Sound like a supportive friend, not a robot.'),
//     duration_minutes: z.number().min(1).max(5).default(2),
//     colorId:          z.enum(['cyan', 'purple', 'coral', 'amber', 'green']).describe(
//       'Difficulty signal for visual ADHD cue: cyan=easiest entry point, green=manageable, amber=moderate, coral=hardest. NEVER start with coral.'
//     ),
//   })).min(3).max(6),
// });

// /* ── Schema 3: Guardian Clinical Brief ────────────────────────────────── */
// const GuardianBriefSchema = z.object({
//   subject:           z.string().max(110).describe('WhatsApp/SMS subject line. Include risk emoji: 🟡 watch / 🟠 pre-burnout / 🔴 acute'),
//   analogy:           z.string().max(280).describe(
//     'ONE powerful non-clinical metaphor. Examples: "browser with 40 tabs open", "car with handbrake on", "phone at 2% battery". NO clinical jargon.'
//   ),
//   vocal_analysis:    z.string().max(180).describe('1-2 sentences on observed stress markers. Use parent-friendly language.'),
//   observed_pattern:  z.string().max(380).describe(
//     '2-3 sentences: what the user attempted, what blocked them, and what this pattern indicates. Warm clinical authority.'
//   ),
//   aura_action_taken: z.string().max(220).describe(
//     'What the AuraOS support system deployed. Frame positively. No technical jargon.'
//   ),
//   parent_action:     z.string().max(280).describe(
//     'SPECIFIC phrases the parent can literally say right now. Include one direct quote in quotation marks. No jargon. Empathy-first.'
//   ),
//   risk_level:        z.enum(['watch', 'pre-burnout', 'acute-distress']).describe(
//     'watch = mild stress; pre-burnout = sustained high load, needs monitoring; acute-distress = crisis intervention warranted.'
//   ),
// });

// /* ── Groq client factory ───────────────────────────────────────────────── */
// const makeModel = (schema, name, temp = 0.38) => {
//   if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set.');
//   const llm = new ChatGroq({
//     model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
//     temperature: temp,
//     apiKey: process.env.GROQ_API_KEY,
//   });
//   return llm.withStructuredOutput(schema, { name, strict: true });
// };

// /* ── Neuroscience-backed system prompts ────────────────────────────────── */

// const STANDARD_SHATTER_PROMPT = `You are an ADHD executive function coach embedded in AuraOS.
// The user is experiencing task paralysis. Your job: atomize their task into the SMALLEST possible steps.

// NEUROSCIENCE RULES:
// 1. Each step = ONE single physical action completable in ~2 minutes. If it takes longer, split it.
// 2. Start EVERY action with a strong imperative verb (Open, Type, Click, Write, Create, Close).
// 3. Make step 1 so easy it's almost laughable — lower the activation threshold to near zero.
// 4. No step should require planning or decision-making — those are separate tasks.
// 5. Tips must sound human and warm, ≤18 words. Avoid "just" (dismissive) and "simply" (condescending).
// 6. Max 8 steps. Only break the FIRST phase of large tasks.
// 7. Specific beats vague: "Open VS Code" not "Open your editor".`;

// const INITIATION_COACH_PROMPT = `You are the Aura Initiation Coach — a neuro-inclusive AI designed for ADHD and anxiety.
// The user told you WHY they are stuck. Use this PRECISELY in your response.

// ENVIRONMENT STRATEGY — choose the best fit:
// • brown_noise → noisy/distracted environment. Activates ambient brown noise.
// • deep_focus_dark → brain fog, fatigue, cognitive overload. Dims screen brightness.
// • meditation_first → acute overwhelm, task feels impossible. Breathing exercise before steps.
// • none → mild friction, no special intervention needed.

// COACH MESSAGE (2 sentences MAX):
// • Sentence 1: Acknowledge their blocker by name. Show you heard them. No empty affirmations.
//   Good: "Brain fog is real — your brain isn't broken, it's conserving energy."
//   Bad: "I understand you're struggling! Let's tackle this together!"
// • Sentence 2: Confirm the environment action you're triggering for them.

// MICROQUEST RULES:
// • Step 1 MUST be cyan (easiest). Never coral for first 2 steps.
// • Be hyper-specific. Name files, buttons, apps. "Go to calendar.app" not "check your calendar".
// • Tips: sound like a friend who's been there. One sentence. Normalize the struggle.
// • Duration: honest estimates. 2 min default, 1 min for tiny tasks, max 5 min.`;

// const GUARDIAN_BRIEF_PROMPT = `You are the AuraOS Clinical Intelligence Layer writing a Guardian Triage Brief.
// This is sent to a parent, school counselor, or therapist during a detected stress spike.

// TONE: Clinical authority + genuine human warmth. Professional but never cold.
// LANGUAGE: Accessible metaphors. Zero medical jargon in the parent-action section.

// RULES:
// • parent_action must contain a DIRECT QUOTE the parent can actually say, in quotation marks.
//   Example: "Try saying: 'I see you're having a hard moment. Want to sit together for a bit?'"
// • Do NOT reveal app mechanics (no "the AI did X"). Use "the support system" instead.
// • risk_level assessment:
//   - 'watch': mild isolated stress event, normal coping capacity intact
//   - 'pre-burnout': pattern of sustained high load, needs external support
//   - 'acute-distress': crisis state, immediate intervention recommended
// • analogy must be conversational and immediately understandable to a non-technical parent.`;

// /* ── Export 1: Standard breakdown ─────────────────────────────────────── */
// export const breakdownTask = async (task) => {
//   if (!task?.trim()) throw new Error('Task is required.');
//   const model = makeModel(MicroQuestSchema, 'generate_microquests');
//   console.log(`[LangChain] Standard breakdown: "${task.slice(0, 80)}"`);
//   const result = await model.invoke([
//     new SystemMessage(STANDARD_SHATTER_PROMPT),
//     new HumanMessage(`Break this overwhelming task into 2-minute micro-steps: "${task}"`),
//   ]);
//   return result.microquests;
// };

// /* ── Export 2: Coach-aware breakdown ──────────────────────────────────── */
// export const coachBreakdown = async (task, blocker) => {
//   if (!task?.trim()) throw new Error('Task is required.');
//   const model = makeModel(InitiationCoachSchema, 'initiation_coach');
//   const blockerLabel = blocker || 'not specified';
//   console.log(`[LangChain] Coach breakdown: "${task.slice(0, 60)}" | blocker: ${blockerLabel}`);
//   const result = await model.invoke([
//     new SystemMessage(INITIATION_COACH_PROMPT),
//     new HumanMessage(
//       `Task to break down: "${task}"\nUser's blocker: "${blockerLabel}"\n\nGenerate coach response and micro-quests.`
//     ),
//   ]);
//   return result;
// };

// /* ── Export 3: Guardian brief ─────────────────────────────────────────── */
// export const generateGuardianBrief = async ({
//   userName, taskSummary, blocker, vocalArousal, emotion, auraAction, recentPatterns,
// }) => {
//   const model = makeModel(GuardianBriefSchema, 'guardian_brief', 0.42);

//   const contextBlock = `
// User: ${userName || 'the user'}
// Attempted task: "${taskSummary || 'unspecified'}"
// Blocker stated: "${blocker || 'overwhelm'}"
// Vocal arousal (1–10): ${vocalArousal ?? 'N/A'} — ${Number(vocalArousal) >= 8 ? 'HIGH' : Number(vocalArousal) >= 6 ? 'ELEVATED' : 'MODERATE'}
// Detected emotion: ${emotion || 'high_anxiety'}
// AuraOS intervention: ${auraAction || 'Somatic interruption deployed.'}
// 24h pattern: ${recentPatterns || 'Elevated stress with task avoidance.'}
// `.trim();

//   console.log(`[LangChain] Guardian brief for: ${userName}`);
//   const result = await model.invoke([
//     new SystemMessage(GUARDIAN_BRIEF_PROMPT),
//     new HumanMessage(`Generate the Guardian Triage Brief:\n\n${contextBlock}`),
//   ]);
//   return result;
// };





































// // chat gpt 
// // src/services/langchain.js — Optimized v2.0 (OpenAI Engine)

// import { ChatOpenAI } from '@langchain/openai';
// import { z } from 'zod';
// import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// /* ── Schema 1: Standard micro-quest breakdown ──────────────────────────── */
// const MicroQuestSchema = z.object({
//   microquests: z.array(z.object({
//     id:               z.number().int().min(1),
//     action:           z.string().max(200).describe('Single imperative physical action, ~2 minutes. Start with an ACTION VERB.'),
//     tip:              z.string().max(180).describe('One warm, ADHD-friendly encouragement ≤18 words. No toxic positivity.'),
//     duration_minutes: z.number().min(1).max(5).default(2),
//   })).min(2).max(8),
// });

// /* ── Schema 2: Initiation Coach (blocker-aware) ────────────────────────── */
// const InitiationCoachSchema = z.object({
//   coach_message: z.string().max(260).describe(
//     '2 sentences MAX. Sentence 1: acknowledge their exact blocker with empathy. Sentence 2: confirm the environment action AuraOS is taking.'
//   ),
//   environment_strategy: z.enum(['brown_noise', 'deep_focus_dark', 'meditation_first', 'none']).describe(
//     'brown_noise = noisy/distracted; deep_focus_dark = brain fog/tired; meditation_first = overwhelmed/frozen; none = mild friction only.'
//   ),
//   microquests: z.array(z.object({
//     id:               z.string().describe('Unique step ID, e.g. "step-1"'),
//     text:             z.string().max(180).describe('Ultra-specific 2-minute action. Start with an ACTION VERB. Mention tools/apps by name when relevant.'),
//     tip:              z.string().max(160).describe('1-sentence warm ADHD tip. Sound like a supportive friend, not a robot.'),
//     duration_minutes: z.number().min(1).max(5).default(2),
//     colorId:          z.enum(['cyan', 'purple', 'coral', 'amber', 'green']).describe(
//       'Difficulty signal for visual ADHD cue: cyan=easiest entry point, green=manageable, amber=moderate, coral=hardest. NEVER start with coral.'
//     ),
//   })).min(3).max(6),
// });

// /* ── Schema 3: Guardian Clinical Brief ────────────────────────────────── */
// const GuardianBriefSchema = z.object({
//   subject:           z.string().max(110).describe('WhatsApp/SMS subject line. Include risk emoji: 🟡 watch / 🟠 pre-burnout / 🔴 acute'),
//   analogy:           z.string().max(280).describe(
//     'ONE powerful non-clinical metaphor. Examples: "browser with 40 tabs open", "car with handbrake on", "phone at 2% battery". NO clinical jargon.'
//   ),
//   vocal_analysis:    z.string().max(180).describe('1-2 sentences on observed stress markers. Use parent-friendly language.'),
//   observed_pattern:  z.string().max(380).describe(
//     '2-3 sentences: what the user attempted, what blocked them, and what this pattern indicates. Warm clinical authority.'
//   ),
//   aura_action_taken: z.string().max(220).describe(
//     'What the AuraOS support system deployed. Frame positively. No technical jargon.'
//   ),
//   parent_action:     z.string().max(280).describe(
//     'SPECIFIC phrases the parent can literally say right now. Include one direct quote in quotation marks. No jargon. Empathy-first.'
//   ),
//   risk_level:        z.enum(['watch', 'pre-burnout', 'acute-distress']).describe(
//     'watch = mild stress; pre-burnout = sustained high load, needs monitoring; acute-distress = crisis intervention warranted.'
//   ),
// });

// /* ── OpenAI client factory ───────────────────────────────────────────────── */
// const makeModel = (schema, name, temp = 0.38) => {
//   if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set.');
  
//   const llm = new ChatOpenAI({
//     modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
//     temperature: temp,
//     openAIApiKey: process.env.OPENAI_API_KEY,
//   });
  
//   // LangChain handles the structured output translation to OpenAI's tools/json_schema automatically
//   return llm.withStructuredOutput(schema, { name, strict: true });
// };

// /* ── Neuroscience-backed system prompts ────────────────────────────────── */

// const STANDARD_SHATTER_PROMPT = `You are an ADHD executive function coach embedded in AuraOS.
// The user is experiencing task paralysis. Your job: atomize their task into the SMALLEST possible steps.

// NEUROSCIENCE RULES:
// 1. Each step = ONE single physical action completable in ~2 minutes. If it takes longer, split it.
// 2. Start EVERY action with a strong imperative verb (Open, Type, Click, Write, Create, Close).
// 3. Make step 1 so easy it's almost laughable — lower the activation threshold to near zero.
// 4. No step should require planning or decision-making — those are separate tasks.
// 5. Tips must sound human and warm, ≤18 words. Avoid "just" (dismissive) and "simply" (condescending).
// 6. Max 8 steps. Only break the FIRST phase of large tasks.
// 7. Specific beats vague: "Open VS Code" not "Open your editor".`;

// const INITIATION_COACH_PROMPT = `You are the Aura Initiation Coach — a neuro-inclusive AI designed for ADHD and anxiety.
// The user told you WHY they are stuck. Use this PRECISELY in your response.

// ENVIRONMENT STRATEGY — choose the best fit:
// • brown_noise → noisy/distracted environment. Activates ambient brown noise.
// • deep_focus_dark → brain fog, fatigue, cognitive overload. Dims screen brightness.
// • meditation_first → acute overwhelm, task feels impossible. Breathing exercise before steps.
// • none → mild friction, no special intervention needed.

// COACH MESSAGE (2 sentences MAX):
// • Sentence 1: Acknowledge their blocker by name. Show you heard them. No empty affirmations.
//   Good: "Brain fog is real — your brain isn't broken, it's conserving energy."
//   Bad: "I understand you're struggling! Let's tackle this together!"
// • Sentence 2: Confirm the environment action you're triggering for them.

// MICROQUEST RULES:
// • Step 1 MUST be cyan (easiest). Never coral for first 2 steps.
// • Be hyper-specific. Name files, buttons, apps. "Go to calendar.app" not "check your calendar".
// • Tips: sound like a friend who's been there. One sentence. Normalize the struggle.
// • Duration: honest estimates. 2 min default, 1 min for tiny tasks, max 5 min.`;

// const GUARDIAN_BRIEF_PROMPT = `You are the AuraOS Clinical Intelligence Layer writing a Guardian Triage Brief.
// This is sent to a parent, school counselor, or therapist during a detected stress spike.

// TONE: Clinical authority + genuine human warmth. Professional but never cold.
// LANGUAGE: Accessible metaphors. Zero medical jargon in the parent-action section.

// RULES:
// • parent_action must contain a DIRECT QUOTE the parent can actually say, in quotation marks.
//   Example: "Try saying: 'I see you're having a hard moment. Want to sit together for a bit?'"
// • Do NOT reveal app mechanics (no "the AI did X"). Use "the support system" instead.
// • risk_level assessment:
//   - 'watch': mild isolated stress event, normal coping capacity intact
//   - 'pre-burnout': pattern of sustained high load, needs external support
//   - 'acute-distress': crisis state, immediate intervention recommended
// • analogy must be conversational and immediately understandable to a non-technical parent.`;

// /* ── Export 1: Standard breakdown ─────────────────────────────────────── */
// export const breakdownTask = async (task) => {
//   if (!task?.trim()) throw new Error('Task is required.');
//   const model = makeModel(MicroQuestSchema, 'generate_microquests');
//   console.log(`[LangChain-OpenAI] Standard breakdown: "${task.slice(0, 80)}"`);
//   const result = await model.invoke([
//     new SystemMessage(STANDARD_SHATTER_PROMPT),
//     new HumanMessage(`Break this overwhelming task into 2-minute micro-steps: "${task}"`),
//   ]);
//   return result.microquests;
// };

// /* ── Export 2: Coach-aware breakdown ──────────────────────────────────── */
// export const coachBreakdown = async (task, blocker) => {
//   if (!task?.trim()) throw new Error('Task is required.');
//   const model = makeModel(InitiationCoachSchema, 'initiation_coach');
//   const blockerLabel = blocker || 'not specified';
//   console.log(`[LangChain-OpenAI] Coach breakdown: "${task.slice(0, 60)}" | blocker: ${blockerLabel}`);
//   const result = await model.invoke([
//     new SystemMessage(INITIATION_COACH_PROMPT),
//     new HumanMessage(
//       `Task to break down: "${task}"\nUser's blocker: "${blockerLabel}"\n\nGenerate coach response and micro-quests.`
//     ),
//   ]);
//   return result;
// };

// /* ── Export 3: Guardian brief ─────────────────────────────────────────── */
// export const generateGuardianBrief = async ({
//   userName, taskSummary, blocker, vocalArousal, emotion, auraAction, recentPatterns,
// }) => {
//   const model = makeModel(GuardianBriefSchema, 'guardian_brief', 0.42);

//   const contextBlock = `
// User: ${userName || 'the user'}
// Attempted task: "${taskSummary || 'unspecified'}"
// Blocker stated: "${blocker || 'overwhelm'}"
// Vocal arousal (1–10): ${vocalArousal ?? 'N/A'} — ${Number(vocalArousal) >= 8 ? 'HIGH' : Number(vocalArousal) >= 6 ? 'ELEVATED' : 'MODERATE'}
// Detected emotion: ${emotion || 'high_anxiety'}
// AuraOS intervention: ${auraAction || 'Somatic interruption deployed.'}
// 24h pattern: ${recentPatterns || 'Elevated stress with task avoidance.'}
// `.trim();

//   console.log(`[LangChain-OpenAI] Guardian brief for: ${userName}`);
//   const result = await model.invoke([
//     new SystemMessage(GUARDIAN_BRIEF_PROMPT),
//     new HumanMessage(`Generate the Guardian Triage Brief:\n\n${contextBlock}`),
//   ]);
//   return result;
// };




























// // deepseek
// // src/services/langchain.js — Optimized v3.0 (DeepSeek Engine)

// import { ChatOpenAI } from '@langchain/openai';
// import { z } from 'zod';
// import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// /* ── Schemas (Keep these exactly the same) ────────────────────────────── */
// const MicroQuestSchema = z.object({
//   microquests: z.array(z.object({
//     id:               z.number().int().min(1),
//     action:           z.string().max(200),
//     tip:              z.string().max(180),
//     duration_minutes: z.number().min(1).max(5).default(2),
//   })).min(2).max(8),
// });

// const InitiationCoachSchema = z.object({
//   coach_message: z.string().max(260),
//   environment_strategy: z.enum(['brown_noise', 'deep_focus_dark', 'meditation_first', 'none']),
//   microquests: z.array(z.object({
//     id:               z.string(),
//     text:             z.string().max(180),
//     tip:              z.string().max(160),
//     duration_minutes: z.number().min(1).max(5).default(2),
//     colorId:          z.enum(['cyan', 'purple', 'coral', 'amber', 'green']),
//   })).min(3).max(6),
// });

// const GuardianBriefSchema = z.object({
//   subject:           z.string().max(110),
//   analogy:           z.string().max(280),
//   vocal_analysis:    z.string().max(180),
//   observed_pattern:  z.string().max(380),
//   aura_action_taken: z.string().max(220),
//   parent_action:     z.string().max(280),
//   risk_level:        z.enum(['watch', 'pre-burnout', 'acute-distress']),
// });

// /* ── DeepSeek client factory ─────────────────────────────────────────────── */
// const makeModel = (schema, name, temp = 0.38) => {
//   if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not set.');
  
//   const llm = new ChatOpenAI({
//     modelName: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
//     temperature: temp,
//     openAIApiKey: process.env.DEEPSEEK_API_KEY,
//     configuration: {
//       baseURL: 'https://api.deepseek.com', // <-- The Magic Line that routes to DeepSeek
//     }
//   });
  
//   return llm.withStructuredOutput(schema, { name, strict: true });
// };

// /* ── System Prompts ────────────────────────────────────────────────────── */

// const STANDARD_SHATTER_PROMPT = `You are an ADHD executive function coach embedded in AuraOS.
// The user is experiencing task paralysis. Your job: atomize their task into the SMALLEST possible steps.
// NEUROSCIENCE RULES:
// 1. Each step = ONE single physical action completable in ~2 minutes.
// 2. Start EVERY action with a strong imperative verb.
// 3. Tips must sound human and warm, ≤18 words.`;

// const INITIATION_COACH_PROMPT = `You are the Aura Initiation Coach — a neuro-inclusive AI designed for ADHD and anxiety.
// The user told you WHY they are stuck. Use this PRECISELY in your response.
// ENVIRONMENT STRATEGY:
// • brown_noise → noisy/distracted.
// • deep_focus_dark → brain fog/fatigue.
// • meditation_first → acute overwhelm.
// • none → mild friction.
// COACH MESSAGE: Acknowledge blocker with empathy, confirm environment change.
// MICROQUESTS: Step 1 MUST be cyan (easiest). Be hyper-specific.`;

// const GUARDIAN_BRIEF_PROMPT = `You are the AuraOS Clinical Intelligence Layer writing a Guardian Triage Brief.
// TONE: Clinical authority + genuine human warmth.
// RULES:
// • parent_action must contain a DIRECT QUOTE the parent can actually say.
// • Do NOT reveal app mechanics (no "the AI did X").
// • analogy must be conversational and immediately understandable.`;

// /* ── Exports ───────────────────────────────────────────────────────────── */
// export const breakdownTask = async (task) => {
//   const model = makeModel(MicroQuestSchema, 'generate_microquests');
//   console.log(`[LangChain-DeepSeek] Standard breakdown...`);
//   const result = await model.invoke([
//     new SystemMessage(STANDARD_SHATTER_PROMPT),
//     new HumanMessage(`Break this task into micro-steps: "${task}"`),
//   ]);
//   return result.microquests;
// };

// export const coachBreakdown = async (task, blocker) => {
//   const model = makeModel(InitiationCoachSchema, 'initiation_coach');
//   console.log(`[LangChain-DeepSeek] Coach breakdown...`);
//   return await model.invoke([
//     new SystemMessage(INITIATION_COACH_PROMPT),
//     new HumanMessage(`Task: "${task}"\nBlocker: "${blocker || 'overwhelm'}"`),
//   ]);
// };

// export const generateGuardianBrief = async (data) => {
//   const model = makeModel(GuardianBriefSchema, 'guardian_brief', 0.42);
//   const contextBlock = `User: ${data.userName || 'the user'}\nTask: "${data.taskSummary}"\nBlocker: "${data.blocker}"\nArousal: ${data.vocalArousal}\nEmotion: ${data.emotion}`;
  
//   console.log(`[LangChain-DeepSeek] Generating brief...`);
//   return await model.invoke([
//     new SystemMessage(GUARDIAN_BRIEF_PROMPT),
//     new HumanMessage(`Generate Triage Brief:\n\n${contextBlock}`),
//   ]);
// };























// open router 
// src/services/langchain.js — Optimized v4.0 (OpenRouter Engine)

import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

/* ── Schemas (Keep these exactly the same) ────────────────────────────── */
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
  analogy:           z.string().max(300).describe('ONE powerful non-clinical metaphor grounded in data.'),
  risk_level:        z.enum(['watch', 'pre-burnout', 'acute-distress']).describe('Clinical risk triage.'),
});

/* ── OpenRouter client factory ───────────────────────────────────────────── */
/* ── OpenRouter / DeepSeek client factory ────────────────────────────────── */
const makeModel = (schema, name, temp = 0.38) => {
  // Swap this to DEEPSEEK_API_KEY if you went back to DeepSeek
  const apiKey = process.env.OPENROUTER_API_KEY; 
  if (!apiKey) throw new Error('API_KEY is not set.');
  
  const llm = new ChatOpenAI({
    modelName: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    temperature: temp,
    apiKey: apiKey, // Use apiKey instead of openAIApiKey for newer LangChain versions
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1', // Or 'https://api.deepseek.com'
      defaultHeaders: {
        'Authorization': `Bearer ${apiKey}`, // <-- THE BULLETPROOF FIX
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'AuraOS',
      }
    }
  });
  
  return llm.withStructuredOutput(schema, { name, strict: true });
};

/* ── System Prompts ────────────────────────────────────────────────────── */

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
8. If the task is vague, make reasonable assumptions and be specific anyway.

EXAMPLE — CORRECT:
Task: "Write my history essay"
→ "Open Google Docs and create a blank document titled 'History Essay Draft'"
→ "Type your thesis statement in one sentence — just get words down, don't edit"
→ "Write 3 bullet points for your first body paragraph — facts only"

EXAMPLE — WRONG (NEVER do this):
→ "Take three deep breaths to center yourself" ← FORBIDDEN
→ "Remind yourself that you are capable" ← FORBIDDEN`;

const INITIATION_COACH_PROMPT = `You are the Aura Initiation Coach — a neuro-inclusive AI designed for ADHD and anxiety.
The user told you WHY they are stuck. Use this PRECISELY in your response.

ABSOLUTE RULES — VIOLATION = FAILURE:
1. NEVER generate therapy advice, coping strategies, or self-care steps as microquests.
2. Every microquest MUST be a concrete physical action to complete the user's ACTUAL task.
3. If the blocker is "too noisy", acknowledge it in the coach message but STILL give task-specific steps.
4. The coach_message is the ONLY place for empathy. Microquests = pure task execution.

ENVIRONMENT STRATEGY:
• brown_noise → noisy/distracted.
• deep_focus_dark → brain fog/fatigue.
• meditation_first → acute overwhelm.
• none → mild friction.

COACH MESSAGE: Acknowledge blocker with empathy (1-2 sentences), confirm environment change. Keep it warm but brief.
MICROQUESTS: Step 1 MUST be cyan (easiest). Be hyper-specific to the user's task. Start with imperative verbs.`;

const GUARDIAN_BRIEF_PROMPT = `You are a Principal Clinical Data Architect and Behavioral Health Strategist. You are writing a "Deep Diagnosis" session report for AuraOS.

MISSION:
Transform raw intake + guardian observations + live telemetry into profound clinical insights. Do not just regurgitate data. Perform a deep, dynamic synthesis.
Example: Instead of "User got 4 errors in Color Sort," say "High error rates in spatial sorting combined with elevated vocal arousal suggest acute executive dysfunction and impulse control fatigue."
Required example style: "The guardian noted frequent night-time isolation, which correlates with the patient's severe cognitive rigidity scores in Perception Probe and elevated baseline stress intake."

STRUCTURED OUTPUT SECTIONS:
1. executive_summary: A synthesis of the patient's current neuropsychological state. Is this a state-based freeze or a trait-based burnout?
2. intake_correlations: Directly connect patient self-report with guardian observational MCQs. Use at least one "guardian noted X, patient reported Y" sentence when data exists.
3. telemetry_correlations: Directly connect intake + guardian observations to game latency/accuracy, worry density, acoustic arousal, and stress spikes.
4. somatic_biological_markers: Interpret vocal arousal (1-10) and acoustic stress markers. How does this correlate with the stated blocker?
5. cognitive_rigidity_focus: Analyze game performance (latency, accuracy). High latency in Perception Probe suggests cognitive inflexibility. Rhythm Sync variance suggests timing dysregulation. Spark Canvas hesitation suggests inhibition.
6. actionable_protocol / guardian_protocol: A precise behavioral protocol. Include exactly ONE direct quote for the guardian to say.
7. patient_strengths: Identify protective factors from completed tasks, regulation attempts, successful game signals, or help-seeking.
8. analogy: A data-grounded metaphor (e.g. "a CPU thermal throttling due to background task density").

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

/* ── Exports ───────────────────────────────────────────────────────────── */
export const breakdownTask = async (task) => {
  const model = makeModel(MicroQuestSchema, 'generate_microquests');
  console.log(`[LangChain-OpenRouter] Standard breakdown...`);
  const result = await model.invoke([
    new SystemMessage(STANDARD_SHATTER_PROMPT),
    new HumanMessage(`Break this task into micro-steps: "${task}"`),
  ]);
  return result.microquests;
};

export const coachBreakdown = async (task, blocker) => {
  const model = makeModel(InitiationCoachSchema, 'initiation_coach');
  console.log(`[LangChain-OpenRouter] Coach breakdown...`);
  return await model.invoke([
    new SystemMessage(INITIATION_COACH_PROMPT),
    new HumanMessage(`Task: "${task}"\nBlocker: "${blocker || 'overwhelm'}"`),
  ]);
};

export const generateGuardianBrief = async (data) => {
  const model = makeModel(GuardianBriefSchema, 'guardian_brief', 0.42);

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
  return await model.invoke([
    new SystemMessage(GUARDIAN_BRIEF_PROMPT),
    new HumanMessage(`Generate the Guardian Triage Brief based ONLY on this telemetry:\n\n${contextBlock}`),
  ]);
};
