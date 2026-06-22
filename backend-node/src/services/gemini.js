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

const FORGE_SYSTEM_INSTRUCTION = `Atomize the user's text into distinct, literal fragments.
RULES:
1. Return JSON: { "worries": [ { "id": 1, "worry": "literal phrase", "weight": 5 } ] }
2. PRESERVE EXACT PHRASING. Do NOT summarize or convert to nouns. If they write "I am lonely", output "I am lonely", NOT "loneliness".
3. Split the text by punctuation (,, ., ;, !) or conjunctions (and, but, because) to create multiple individual blocks.
4. Each block should represent one unbroken fragment of their thought.
5. weight = urgency (1-10, 10=max).
6. "worry" string max 10 words. Max 12 items total.`;

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
 * Extracts worries from text.
 * As per exact user specification, EVERY single word is now atomized into its own block.
 * This bypasses the LLM, reducing latency to 0ms and saving 100% of token costs!
 */
export const extractWorries = async (rawText) => {
  if (!rawText || rawText.trim().length < 1) return [];
  const safeText = rawText.trim().slice(0, 1500);

  // Split by whitespace to extract every individual word
  const words = safeText.split(/\s+/).filter(Boolean);
  
  return words.map((word, idx) => {
    // Optional: assign slightly higher weight to negative words for visual effect
    const isNegative = /^(lonely|stressed|sad|angry|anxious|tensed|depressed|broken|lost|lack)$/i.test(word.replace(/[^a-zA-Z]/g, ''));
    return {
      id: idx + 1,
      worry: word,
      weight: isNegative ? 8 : 5
    };
  });
};
