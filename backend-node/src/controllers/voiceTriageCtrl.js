import { ChatOpenAI } from "@langchain/openai";
import UserState from "../models/UserState.js";

const clampNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const detectDistortions = (text) => {
  const distortions = [];
  if (/\b(always|never|everything|nothing|ruined|hopeless|impossible)\b/i.test(text)) {
    distortions.push("absolutes");
  }
  if (/[.!?]\s*[a-z]{1,12}\s+[a-z]{1,12}\s*[.!?]/i.test(text) || text.split(/\s+/).length < 5) {
    distortions.push("fragmented_speech");
  }
  if (/\b(can't|cannot|panic|overwhelmed|spiral|stuck|freeze|terrified)\b/i.test(text)) {
    distortions.push("acute_distress_language");
  }
  return distortions;
};

const localTriage = ({ transcriptChunk, wpm, averageVolume }) => {
  const text = String(transcriptChunk || "").trim();
  const distortions = detectDistortions(text);
  const lower = text.toLowerCase();
  const severeWords = /\b(panic|can't breathe|terrified|freeze|spiral|unsafe|ending|die|hurt myself)\b/i.test(lower);
  const elevatedWords = /\b(overwhelmed|stuck|anxious|stress|scared|behind|failing|too much)\b/i.test(lower);

  let stressTier = "BASELINE";
  if (severeWords || wpm >= 190 || averageVolume >= 72) {
    stressTier = "PANIC_FREEZE";
  } else if (elevatedWords || distortions.length > 0 || wpm >= 150 || averageVolume >= 48) {
    stressTier = "ELEVATED";
  }

  const groundingResponse =
    stressTier === "PANIC_FREEZE"
      ? "You are not alone in this moment; press your feet into the floor and take one slow breath with me."
      : stressTier === "ELEVATED"
        ? "I hear the pressure in this, and we can shrink it down to one next breath and one next step."
        : "I hear you, and we can keep this gentle and steady.";

  return {
    stressTier,
    detectedDistortions: distortions,
    groundingResponse,
    emotion: 'calm'
  };
};

const getRawLlm = () => {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY_AURAVOICE || process.env.GROQ_API_KEY;
  
  const apiKey = openRouterKey || groqKey;
  if (!apiKey) return null;
  
  const useOpenRouter = !!openRouterKey;

  return new ChatOpenAI({
    modelName: useOpenRouter ? (process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini") : (process.env.GROQ_MODEL || "llama-3.1-8b-instant"),
    temperature: 0.85,
    maxTokens: 512,
    apiKey,
    configuration: {
      baseURL: useOpenRouter ? "https://openrouter.ai/api/v1" : "https://api.groq.com/openai/v1",
      defaultHeaders: useOpenRouter ? {
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'AuraOS Voice Triage',
      } : undefined
    },
  });
};

/**
 * Controller to handle Voice Triage
 * Extracts semantics and velocity from user speech to determine cognitive stress.
 */
export const voiceTriageHandler = async (req, res) => {
  const userId = req.body?.userId;
  const transcriptChunk = String(req.body?.transcriptChunk || "").trim();
  const wpm = clampNumber(req.body?.wpm, 0, 0, 320);
  const averageVolume = clampNumber(req.body?.averageVolume, 0, 0, 100);

  if (!transcriptChunk) {
    return res.status(400).json({ success: false, error: "Missing transcriptChunk in request body." });
  }
  if (transcriptChunk.length > 2000) {
    return res.status(400).json({ success: false, error: "transcriptChunk is too long; max 2000 characters." });
  }

  const fallback = localTriage({ transcriptChunk, wpm, averageVolume });
  const llm = getRawLlm();

  if (!llm) {
    return res.status(200).json({
      success: true,
      data: fallback,
      meta: { source: "local_fallback", reason: "API Key is not configured" },
    });
  }

  // System instructions for the Deep Somatic Linguistic Analyzer
  const prompt = `
    You are Aura, an empathetic, highly advanced emotional intelligence companion.
    
    ACOUSTIC TELEMETRY:
    - Speech Speed: ${wpm} Words Per Minute (Average is 130-150. >160 is fast/anxious, <110 is slow/sad/exhausted).
    - Volume Intensity: ${averageVolume}/100 (Average is 30-50. >60 is loud/intense, <20 is quiet/withdrawn).
    
    USER TRANSCRIPT:
    "${transcriptChunk}"

    MISSION:
    1. Analyze the exact text AND the acoustic telemetry. If they are speaking very fast and loud, they might be panicking or excited. If slow and quiet, they might be depressed or tired.
    2. Respond with EXACTLY 1-3 sentences that are highly dynamic, conversational, and deeply personalized to exactly what they just said. Do NOT give generic or repetitive answers. Reflect their specific words, situation, or emotion back to them.
    3. Be warm, soothing, and utterly human.
    4. Determine the 'stressTier': BASELINE, ELEVATED, or PANIC_FREEZE based on their arousal.
    5. Determine the exact 'emotion' mapping to one of: calm, mild_anxiety, high_anxiety.

    CRITICAL INSTRUCTION:
    You MUST return ONLY a raw JSON object with NO markdown blocks and NO backticks.
    Expected keys:
    - stressTier (String: BASELINE, ELEVATED, PANIC_FREEZE)
    - emotion (String: calm, mild_anxiety, high_anxiety)
    - detectedDistortions (Array of Strings: e.g. "absolutes", "exhaustion", "panic")
    - groundingResponse (String: The deeply personal, highly dynamic conversational spoken response to the user)
  `;

  try {
    const result = await llm.invoke(prompt);
    
    let jsonStr = result.content;
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
    }
    const parsedData = JSON.parse(jsonStr);

    if (userId) {
      try {
        const user = await UserState.findOrCreate(userId);
        await user.logVocalStress({
          emotion: parsedData.emotion || 'calm',
          arousalScore: parsedData.stressTier === 'PANIC_FREEZE' ? 9 : parsedData.stressTier === 'ELEVATED' ? 6 : 2,
          taskContext: "Aura Voice Conversation",
          transcriptChunk,
          wpm,
          detectedDistortions: parsedData.detectedDistortions || []
        });
      } catch (err) {
        console.error("Failed to save voice telemetry to UserState:", err);
      }
    }

    // Return the structured JSON directly to the frontend telemetry caller
    res.status(200).json({
      success: true,
      data: parsedData,
      meta: { source: "groq" },
    });
  } catch (error) {
    console.error("Error during Voice Triage Analysis:", error);
    res.status(200).json({
      success: true,
      data: fallback,
      meta: { source: "local_fallback", reason: "AI provider failed" },
    });
  }
};

import OpenAI, { toFile } from "openai";

/**
 * Controller to handle native Desktop Audio Transcription using Groq Whisper.
 */
export const transcribeAudioHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No audio file provided." });
    }

    const apiKey = process.env.GROQ_API_KEY_AURAVOICE || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "Groq API key not configured." });
    }

    const groq = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const file = await toFile(req.file.buffer, "audio.webm", { type: req.file.mimetype });
    
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      response_format: "json",
      language: "en",
    });

    return res.json({ success: true, text: transcription.text });
  } catch (error) {
    console.error("Audio transcription failed:", error);
    return res.status(500).json({ success: false, error: "Failed to transcribe audio." });
  }
};
