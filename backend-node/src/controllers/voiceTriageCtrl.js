import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import UserState from "../models/UserState.js";

// Define the structured output schema using Zod
const triageSchema = z.object({
  stressTier: z.enum(["BASELINE", "ELEVATED", "PANIC_FREEZE"]).describe("The determined stress tier based on speech patterns and semantics."),
  detectedDistortions: z.array(z.string()).describe("A list of cognitive distortions detected in the transcript, such as absolutes or fragmented speech."),
  groundingResponse: z.string().describe("A short, empathetic, 1-sentence response to instantly ground the user."),
});

let structuredLlm = null;

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
  };
};

const getStructuredLlm = () => {
  if (structuredLlm) return structuredLlm;

  const apiKey = process.env.GROQ_API_KEY_AURAVOICE || process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const llm = new ChatOpenAI({
    modelName: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    temperature: 0.25,
    maxTokens: 512,
    apiKey,
    configuration: {
      baseURL: "https://api.groq.com/openai/v1",
    },
  });

  structuredLlm = llm.withStructuredOutput(triageSchema, {
    name: "CatastrophicLinguisticAnalysis",
    strict: true,
  });
  return structuredLlm;
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
  const model = getStructuredLlm();

  if (!model) {
    return res.status(200).json({
      success: true,
      data: fallback,
      meta: { source: "local_fallback", reason: "GROQ_API_KEY_AURAVOICE or GROQ_API_KEY is not configured" },
    });
  }

  // System instructions for the Catastrophic Linguistic Analyzer
  const prompt = `
    Analyze transcript. WPM: ${wpm}, Vol: ${averageVolume}.
    Text: "${transcriptChunk}"

    1. WPM > 160 = racing thoughts.
    2. Detect cognitive distortions (e.g. absolutes like "never").
    3. Detect fragmented sentences = executive overwhelm.
    4. Set stressTier: BASELINE, ELEVATED, or PANIC_FREEZE.
    5. Write 1-2 short, conversational, empathetic sentences addressing content to help regulate.
  `;

  try {
    const result = await model.invoke(prompt);

    if (userId) {
      try {
        const user = await UserState.findOrCreate(userId);
        let mappedEmotion = 'calm';
        if (result.stressTier === 'ELEVATED') mappedEmotion = 'mild_anxiety';
        else if (result.stressTier === 'PANIC_FREEZE') mappedEmotion = 'high_anxiety';
        
        await user.logVocalStress({
          emotion: mappedEmotion,
          arousalScore: result.stressTier === 'PANIC_FREEZE' ? 9 : result.stressTier === 'ELEVATED' ? 6 : 2,
          taskContext: "Aura Voice Conversation"
        });
      } catch (err) {
        console.error("Failed to save voice telemetry to UserState:", err);
      }
    }

    // Return the structured JSON directly to the frontend telemetry caller
    res.status(200).json({
      success: true,
      data: result,
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
