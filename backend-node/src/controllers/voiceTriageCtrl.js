import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler.js";

// Initialize Gemini LLM using LangChain
// Note: Ensure GOOGLE_API_KEY is available in process.env
const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-1.5-pro",
  maxOutputTokens: 2048,
});

// Define the structured output schema using Zod
const triageSchema = z.object({
  stressTier: z.enum(["BASELINE", "ELEVATED", "PANIC_FREEZE"]).describe("The determined stress tier based on speech patterns and semantics."),
  detectedDistortions: z.array(z.string()).describe("A list of cognitive distortions detected in the transcript, such as absolutes or fragmented speech."),
  groundingResponse: z.string().describe("A short, empathetic, 1-sentence response to instantly ground the user."),
});

// Create the structured LLM chain
const structuredLlm = llm.withStructuredOutput(triageSchema, {
  name: "CatastrophicLinguisticAnalysis",
});

/**
 * Controller to handle Voice Triage
 * Extracts semantics and velocity from user speech to determine cognitive stress.
 */
export const voiceTriageHandler = async (req, res) => {
  const { transcriptChunk, wpm, averageVolume } = req.body;

  if (!transcriptChunk) {
    return res.status(400).json({ success: false, message: "Missing transcriptChunk in request body." });
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
    const result = await structuredLlm.invoke(prompt);

    // Return the structured JSON directly to the frontend telemetry caller
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error during Voice Triage Analysis:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform semantic triage.",
      error: error.message,
    });
  }
};
