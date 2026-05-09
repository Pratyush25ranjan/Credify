/**
 * aiService.js — REBUILT for stance-based pipeline
 * ─────────────────────────────────────────────────────────────
 * Changes from original:
 *  1. Accepts full article body text (fetched by mlService) — not
 *     just titles and URLs. Gemini reads actual article content.
 *  2. Receives sub-claim breakdown and per-sub-claim stance results
 *     from server.js, so the synthesis prompt is far richer.
 *  3. Prompts Gemini to synthesise across all sub-claims and
 *     weighted stance evidence into a coherent final verdict.
 *  4. All original reliability improvements retained:
 *     - BLOCK_NONE safety filters
 *     - responseMimeType: "application/json"
 *     - Exponential backoff retry (3 attempts)
 *     - Source hallucination guard
 *     - temperature: 0.1
 */
import dotenv from "dotenv";
dotenv.config();
console.log(
  "Gemini key loaded:",
  !!process.env.GEMINI_API_KEY
);
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];


const VALID_VERDICTS      = new Set(["TRUE", "FALSE", "PARTIALLY TRUE", "UNCERTAIN"]);
const MAX_EXPLANATION_WORDS = 120;
const MAX_RETRIES         = 3;
const RETRY_DELAY_MS      = 1500;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function clamp(v, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

function trimToWords(text, maxWords) {
  const words = (text || "").trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ") + "…";
}

function normaliseVerdict(raw) {
  const upper = (raw || "").toUpperCase().trim();
  if (VALID_VERDICTS.has(upper)) return upper;
  if (upper.includes("PARTIAL")) return "PARTIALLY TRUE";
  if (upper.includes("TRUE"))    return "TRUE";
  if (upper.includes("FALSE"))   return "FALSE";
  return "UNCERTAIN";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the evidence block for the synthesis prompt.
 * Now includes full article body text (truncated) and stance labels.
 * Returns both the prompt text and a list of known URLs for the hallucination guard.
 */
function buildSynthesisPrompt(originalClaim, enrichedInput) {
  const { subClaims, subClaimResults, trustedSources, otherSources, credibilityScore } = enrichedInput;

  // ── Sub-claim summary ──────────────────────────────────────
  let subClaimSection = "";
  if (subClaims && subClaims.length > 1) {
    subClaimSection = `\nSUB-CLAIMS IDENTIFIED:\n`;
    subClaims.forEach((sc, i) => {
      const result = subClaimResults?.[i];
      const total = (result?.stanceSummary?.supports || 0) + (result?.stanceSummary?.refutes || 0);
      const support = result?.stanceSummary?.supports || 0;
      const refute = result?.stanceSummary?.refutes || 0;
      subClaimSection += `${i + 1}. "${sc}"\n   Evidence: ${support} supporting, ${refute} refuting, ${result?.stanceSummary?.unrelated || 0} unrelated\n`;
    });
  }

  // ── Trusted source articles with full text ─────────────────
  const trustedURLs = [];
  let trustedSection = "";
  const trusted = trustedSources || {};

  for (const [source, articles] of Object.entries(trusted)) {
    for (const a of articles.slice(0, 1)) {
      if (!a.title || !a.url) continue;
      trustedSection += `[${source.toUpperCase()}] — Stance: ${a.stance || "UNRELATED"} (confidence: ${(a.stanceConfidence || 0).toFixed(2)})\n`;
      trustedSection += `Title: ${a.title}\n`;
      trustedSection += `URL: ${a.url}\n`;
      if (a.text && a.text.length > 50) {
       trustedSection += `Excerpt: ${a.text.slice(0, 50)}\n`;
      }
      trustedSection += "\n";
      trustedURLs.push(a.url);
    }
  }

  // ── Other source articles ──────────────────────────────────
  let otherSection = "";
  for (const a of (otherSources || []).slice(0, 1)) {
    if (!a.title || !a.url) continue;
    otherSection += `Stance: ${a.stance || "UNRELATED"} (confidence: ${(a.stanceConfidence || 0).toFixed(2)})\n`;
    otherSection += `Title: ${a.title}\n`;
    otherSection += `URL: ${a.url}\n`;
    if (a.text && a.text.length > 50) {
     otherSection += `Excerpt: ${a.text.slice(0, 50)}\n`;
    }
    otherSection += "\n";
  }

  const prompt = `Fact-check the following claim. Use the full article text provided — not just headlines.

ORIGINAL CLAIM:
"${originalClaim}"
${subClaimSection}
STANCE-BASED CREDIBILITY SCORE (pre-computed): ${(credibilityScore || 0).toFixed(3)}
(1.0 = fully supported, 0.0 = fully refuted, 0.5 = no clear evidence)

EVIDENCE FROM TRUSTED SOURCES (with article content):
${trustedSection.trim() || "None available."}

EVIDENCE FROM OTHER SOURCES (with article content):
${otherSection.trim() || "None available."}

INSTRUCTIONS:
- The article excerpts contain REAL content fetched from each article — read them carefully.
- UNRELATED articles should carry no weight.
- Articles with confidence < 0.4 should carry less weight.
- If trusted-source content contradicts the claim, that is strong evidence of falsehood.
- Cross-reference with your own knowledge for context.
- Do NOT fabricate sources. Only use URLs from the evidence above.

Return ONLY this JSON (no markdown, no preamble):
{
  "verdict": "TRUE" | "FALSE" | "PARTIALLY TRUE" | "UNCERTAIN",
  "confidence": <float 0.0–1.0>,
  "explanation": "<max ${MAX_EXPLANATION_WORDS} words — cite specific article findings>",
  "sources": ["<url>", ...]
}`;

  return { prompt, trustedURLs };
}

/**
 * Call Gemini with exponential backoff retry.
 */
async function callGeminiWithRetry(prompt) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      
const model = genAI.getGenerativeModel({
 model: "gemini-2.5-flash-lite",

  safetySettings: SAFETY_SETTINGS,

  generationConfig: {
    temperature: 0.1,
    topP: 0.8,
    maxOutputTokens: 256,

    responseMimeType: "application/json",

    responseSchema: {
      type: "OBJECT",

      properties: {
        verdict: {
          type: "STRING",
        },

        confidence: {
          type: "NUMBER",
        },

        explanation: {
          type: "STRING",
        },

        sources: {
          type: "ARRAY",
          items: {
            type: "STRING",
          },
        },
      },

      required: [
        "verdict",
        "confidence",
        "explanation",
        "sources",
      ],
    },
  },
  systemInstruction: `You are an expert fact-checking AI integrated into a news verification system.
Your ONLY output is a single valid JSON object. No markdown. No explanation outside the JSON.
Always classify claims into exactly one of: TRUE, FALSE, PARTIALLY TRUE, UNCERTAIN.
Base your verdict on the provided evidence (which includes full article text) AND your own knowledge.
Prioritise evidence from trusted sources (BBC, Reuters, AP, NYT, Al Jazeera).
The stance data (SUPPORTS/REFUTES/UNRELATED) has already been computed — trust it, but apply your own judgement too.`,
});


const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text || !text.trim()) throw new Error("Gemini returned empty body");
      return text;
    } catch (err) {
      lastError = err;
      const isRetryable =
        err.message?.includes("503") ||
        err.message?.includes("429") ||
        err.message?.includes("500") ||
        err.message?.includes("empty");

      if (!isRetryable || attempt === MAX_RETRIES) break;

      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`⚠️  Gemini attempt ${attempt} failed (${err.message}) — retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function extractJSON(raw) {
  const stripped = raw
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();

  try { JSON.parse(stripped); return stripped; } catch (_) { /* fall through */ }

  const match = stripped.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * Final AI synthesis step.
 * Takes the full enriched input (sub-claims, stance results, article text)
 * and produces a coherent verdict + explanation.
 *
 * @param {string} originalClaim
 * @param {object} enrichedInput - { subClaims, subClaimResults, trustedSources, otherSources, credibilityScore }
 */
export async function analyzeWithAI(originalClaim, enrichedInput) {
  const { prompt, trustedURLs } = buildSynthesisPrompt(originalClaim, enrichedInput);

  try {
    console.info("📤 Sending enriched evidence to Gemini for final synthesis…");

    const raw = await callGeminiWithRetry(prompt);

console.log("🔥 RAW GEMINI RESPONSE:");
console.log(raw);

// 🔥 Empty response protection
if (!raw || !raw.trim()) {
  throw new Error("Gemini returned empty response");
}

let parsed = null;

// 1. Direct parse attempt
try {

  parsed = JSON.parse(raw);

} catch {

  // 2. Extract JSON object from messy output
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  if (jsonMatch) {

    try {

      parsed = JSON.parse(jsonMatch[0]);

    } catch (err) {

      console.warn(
        "⚠️ Extracted JSON parse failed:",
        err.message
      );
    }
  }
}

// 🔥 Final fallback
if (!parsed || typeof parsed !== "object") {

  console.warn(
    "⚠️ Gemini returned non-JSON response"
  );

  return {
    verdict: "UNCERTAIN",
    confidence: 0.5,
    explanation:
      "AI could not generate structured verification output.",
    sources: [],
  };
}

    const verdict     = normaliseVerdict(parsed.verdict);
    const confidence  = clamp(typeof parsed.confidence === "number" ? parsed.confidence : 0.5);
    const explanation = trimToWords(
      typeof parsed.explanation === "string" && parsed.explanation.trim()
        ? parsed.explanation
        : "No explanation provided.",
      MAX_EXPLANATION_WORDS
    );

    // Hallucination guard — only return URLs we actually provided as evidence
    const evidenceURLSet = new Set(trustedURLs);
    const sources = Array.isArray(parsed.sources)
      ? parsed.sources
          .filter((s) => typeof s === "string" && s.startsWith("http"))
          .filter((s) => trustedURLs.length === 0 || evidenceURLSet.has(s))
          .slice(0, 5)
      : trustedURLs.slice(0, 3);

    console.info(`✅ Final verdict: ${verdict}  Confidence: ${confidence.toFixed(2)}`);
    return { verdict, confidence, explanation, sources };

  } catch (error) {
  console.error("🔥🔥 FULL GEMINI ERROR OBJECT:");
  console.error(error);
  console.error("🔥 MESSAGE:", error.message);
  console.error("🔥 STACK:", error.stack);

  return {
    verdict: "UNCERTAIN",
    confidence: 0.5,
    explanation: "AI ERROR: " + error.message,
    sources: [],
  };
}
}