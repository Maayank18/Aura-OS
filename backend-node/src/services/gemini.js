// src/services/gemini.js (Unified AI Engine)
// Consolidated Groq and OpenRouter integration with bulletproof headers.

import OpenAI from 'openai';

let aiClient = null;

const getClient = () => {
  if (!aiClient) {
    // Priority 1: Groq (Forge), Priority 2: OpenRouter
    const apiKey = process.env.GROQ_API_KEY_FORGE || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('API_KEY (GROQ_API_KEY_FORGE, GROQ_API_KEY, or OPENROUTER_API_KEY) is not set in environment variables.');
    }

    aiClient = new OpenAI({
      baseURL: (process.env.GROQ_API_KEY_FORGE || process.env.GROQ_API_KEY)
        ? 'https://api.groq.com/openai/v1' 
        : 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:5173', 
        'X-Title': 'AuraOS', 
      },
    });
  }
  return aiClient;
};

const FORGE_SYSTEM_INSTRUCTION = `Extract distinct worries from anxious text.
RULES:
1. Return JSON: { "worries": [ { "id": 1, "worry": "short string", "weight": 5 } ] }
2. weight = urgency (1-10, 10=max).
3. Combine duplicates. Max 10 items.
4. "worry" max 8 words.
5. If none, return { "worries": [] }`;

const localFallbackExtraction = (rawText) => {
  const segments = rawText.split(/[,.!?;\n]+/).map((s) => s.trim()).filter(Boolean);
  const worries = segments.slice(0, 6).map((segment, idx) => {
    const short = segment.split(/\s+/).slice(0, 8).join(' ');
    const hasStressWords = /(can't|cannot|worried|anxious|stress|deadline|rent|money|health|afraid|panic)/i.test(segment);
    return { id: idx + 1, worry: short || 'general worry', weight: hasStressWords ? 7 : 5 };
  });
  return worries.length ? worries : [{ id: 1, worry: 'general overwhelm', weight: 5 }];
};

/**
 * Extracts worries from text using the configured AI engine (Groq or OpenRouter).
 */
export const extractWorries = async (rawText) => {
  if (!rawText || rawText.trim().length < 3) return [];
  const safeText = rawText.trim().slice(0, 1500);

  let client;
  try {
    client = getClient();
  } catch (err) {
    console.error(`[ForgeExtractor] Client init failed: ${err.message}`);
    console.warn('[ForgeExtractor] Falling back to local extractor.');
    return localFallbackExtraction(safeText);
  }

  const modelName = (process.env.GROQ_API_KEY_FORGE || process.env.GROQ_API_KEY)
    ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant')
    : (process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini');

  console.log(`[ForgeExtractor] Extracting worries using ${modelName}...`);

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: FORGE_SYSTEM_INSTRUCTION },
        { role: "user", content: safeText }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' } 
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI provider returned an empty completion.');

    const parsed = JSON.parse(content);
    return parsed.worries || [];

  } catch (err) {
    console.error(`[ForgeExtractor] Extraction failed: ${err.message}`);
    console.warn('[ForgeExtractor] Falling back to local extractor.');
    return localFallbackExtraction(safeText);
  }
};
