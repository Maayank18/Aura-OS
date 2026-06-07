import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

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
    You are a Catastrophic Linguistic Analyzer for a mental health platform.
    Analyze the following transcript from the user. You are provided with the text itself and their speaking velocity in Words Per Minute (WPM), along with average volume.
    
    Metrics:
    - Words Per Minute (WPM): ${wpm}
    - Average Volume: ${averageVolume}
    - Transcript: "${transcriptChunk}"

    Instructions:
    1. Assess if the WPM is over 160, indicating racing thoughts or elevated sympathetic arousal.
    2. Look for cognitive distortions, especially "absolutes" (e.g., "never", "always", "everything is ruined").
    3. Check if the sentence structure is fragmented, indicating time-blindness or executive overwhelm.
    4. Based on these factors, categorize the stressTier into: BASELINE, ELEVATED, or PANIC_FREEZE.
    5. Provide a short, empathetic 1-sentence grounding response to help the user regulate.
  `;

  try {
    const result = await model.invoke(prompt);

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
