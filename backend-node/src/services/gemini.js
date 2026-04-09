// src/services/gemini.js
// Feature 2: Cognitive Forge – worry extraction engine.
//
// Takes a raw, messy paragraph of anxious thoughts and extracts
// each distinct worry into a structured JSON array using Gemini Flash.
// Gemini Flash is chosen for its speed and long context window – it
// handles stream-of-consciousness text better than smaller models.

import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazily initialise so missing API keys don't crash import at startup.
let genAI = null;

const getClient = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// ── Prompt Engineering ────────────────────────────────────────────────────────
//
// Key design decisions:
// 1. "Return ONLY valid JSON" is repeated twice to fight model verbosity.
// 2. We ask for a weight 1-10 so Matter.js can scale block SIZE by urgency.
// 3. We cap at 10 worries to avoid flooding the physics canvas.
// 4. "Be empathetic but clinical" prevents the model from editorialising.
//
const FORGE_SYSTEM_INSTRUCTION = `You are a cognitive extraction engine embedded in a mental health app called AuraOS.
Your sole job is to read messy, anxious, stream-of-consciousness text and extract each distinct worry.

RULES – follow these exactly:
1. Return ONLY a valid JSON array. No markdown fences, no explanation, no preamble.
2. Each item: {"id": <1-based integer>, "worry": "<concise 3-8 word label>", "weight": <1-10>}
3. weight = emotional urgency/distress level (10 = most overwhelming, 1 = minor).
4. Combine duplicate or very similar worries into one entry.
5. Maximum 10 items. If there are more, surface the highest-weight ones.
6. Do not invent worries that are not implied by the text.
7. Keep "worry" labels short enough to fit on a physics block – max 8 words.
8. If the text contains no worries, return an empty array: []

Example input: "I'm so behind on my project and also my mom is sick and I forgot to pay rent again and honestly I don't even know if I'm good enough for this job"
Example output: [{"id":1,"worry":"project deadline slipping","weight":8},{"id":2,"worry":"mom's health","weight":9},{"id":3,"worry":"missed rent payment","weight":6},{"id":4,"worry":"job competence doubts","weight":7}]`;

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Extracts worries from a free-form text input.
 * @param {string} rawText - The user's unstructured worry paragraph.
 * @returns {Promise<Array<{id: number, worry: string, weight: number}>>}
 */
export const extractWorries = async (rawText) => {
  if (!rawText || rawText.trim().length < 3) {
    return [];
  }

  const client = getClient();
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: FORGE_SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.2,        // Low temp = deterministic JSON, less hallucination
      topP: 0.8,
      maxOutputTokens: 1024,
    },
  });

  console.log(`[Gemini] Extracting worries from text (${rawText.length} chars)…`);

  const result = await model.generateContent(rawText);
  const responseText = result.response.text().trim();

  console.log(`[Gemini] Raw response: ${responseText.substring(0, 200)}`);

  // Strip markdown fences if the model ignores our instructions
  const cleaned = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let worries;
  try {
    worries = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('[Gemini] Failed to parse response as JSON:', cleaned);
    throw new Error('AI returned malformed JSON. Please try again.');
  }

  if (!Array.isArray(worries)) {
    throw new Error('AI returned unexpected data shape (expected array).');
  }

  // Sanitise each item defensively
  return worries.map((item, idx) => ({
    id: item.id ?? idx + 1,
    worry: String(item.worry || 'unnamed worry').slice(0, 100),
    weight: Math.min(10, Math.max(1, Number(item.weight) || 5)),
  }));
};