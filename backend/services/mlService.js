/**
 * mlService.js — REBUILT: Stance Detection
 * ─────────────────────────────────────────────────────────────
 * Replaces the ML relevance score pipeline with semantic stance
 * detection. For each top article:
 *
 *   1. Fetch full article body text (axios + @extractus/article-extractor)
 *   2. Ask Gemini to label it: SUPPORTS / REFUTES / UNRELATED
 *   3. Trusted sources carry 1.5× weight in the final ratio
 *
 * Final credibility score = weightedSupports / (weightedSupports + weightedRefutes)
 *
 * This score means exactly what it should: the proportion of
 * corroborating evidence weighted by source trustworthiness.
 */
import dotenv from "dotenv";
dotenv.config();
const API_KEYS = [
  process.env.GEMINI_API_KEY,
].filter(Boolean);

if (!API_KEYS.length) {
  console.log(
  "Loaded Gemini keys:",
  API_KEYS.length
);
  throw new Error(
    "No Gemini API keys found in environment variables"
  );
}

let currentKeyIndex = 0;

function getNextApiKey() {
  const key = API_KEYS[currentKeyIndex];

  console.log(
    "Using Gemini key:",
    currentKeyIndex + 1
  );

  // Safe even with 1 key
  currentKeyIndex =
    (currentKeyIndex + 1) % API_KEYS.length;

  return key;
}
import { extract } from "@extractus/article-extractor";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const TOP_N_FOR_STANCE = 2;        // articles to fetch full text for
const MAX_PER_TRUSTED_SOURCE = 3;
const MAX_OTHER_SOURCES = 5;
const ARTICLE_FETCH_TIMEOUT_MS = 8000;
const ARTICLE_TEXT_CHAR_LIMIT = 300; // truncate before sending to Gemini
const TRUSTED_SOURCE_WEIGHT = 1.5;

// Trusted source registry — checked against BOTH source name and URL
const TRUSTED_SOURCE_MAP = {
  reuters: ["reuters"],
  bbc: ["bbc"],
  ap: ["associated press", "apnews", "ap news"],
  nyt: ["new york times", "nytimes"],
  aljazeera: ["al jazeera", "aljazeera"],
  "times of india": ["times of india", "timesofindia"],
  guardian: ["the guardian", "theguardian"],
  bloomberg: ["bloomberg"],
  "washington post": ["washington post", "washingtonpost"],
  "the hindu": ["the hindu", "thehindu"],
};

// ─────────────────────────────────────────────────────────────
// GEMINI SETUP (for stance labelling)
// ─────────────────────────────────────────────────────────────

function getGenAI() {
  return new GoogleGenerativeAI(
    getNextApiKey()
  );
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];



// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Returns the canonical trusted-source key (e.g. "reuters") or null.
 * Checks both source name and URL to catch RSS articles that lack source.name.
 */
function normalizeTrustedSource(rawSource, url = "") {
  const haystack = `${rawSource} ${url}`.toLowerCase().replace(/[^a-z\s.]/g, "");
  for (const [key, aliases] of Object.entries(TRUSTED_SOURCE_MAP)) {
    if (aliases.some((alias) => haystack.includes(alias))) return key;
  }
  return null;
}

/**
 * IMPROVEMENT 2: Full article text fetching.
 * Uses @extractus/article-extractor to pull the article body from HTML.
 * Falls back to title + description if fetching fails.
 *
 * @param {string} url
 * @param {string} fallbackTitle
 * @param {string} fallbackDescription
 * @returns {Promise<string>}
 */
async function fetchArticleText(url, fallbackTitle = "", fallbackDescription = "") {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ARTICLE_FETCH_TIMEOUT_MS);

    try {
      const article = await extract(url, {
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (article?.content) {
        // Strip HTML tags from extracted content
        const text = article.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > 100) {
          console.info(`📄 Full text fetched for: ${url.slice(0, 60)}… (${text.length} chars)`);
          return text.slice(0, ARTICLE_TEXT_CHAR_LIMIT);
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const reason = err.name === "AbortError" ? "timed out" : err.message;
    console.warn(`⚠️  Full text fetch failed for ${url.slice(0, 60)}…: ${reason}`);
  }

  // Graceful fallback: title + description is still better than nothing
  const fallback = [fallbackTitle, fallbackDescription].filter(Boolean).join(" — ");
  console.info(`📄 Falling back to title/description for: ${url.slice(0, 60)}…`);
  return fallback || "No content available.";
}

/**
 * IMPROVEMENT 1: Stance detection via Gemini.
 * Sends a batch of articles (with full text) to Gemini and asks it to
 * classify each as SUPPORTS / REFUTES / UNRELATED relative to the claim.
 *
 * Batching reduces API calls: one Gemini call for up to 10 articles.
 *
 * @param {string} claim
 * @param {Array<{title, url, text}>} articles
 * @returns {Promise<Array<{url, stance, confidence, reason}>>}
 */
async function batchDetectStance(claim, articles) {
  if (!articles.length) return [];

  const articleList = articles
    .map((a, i) =>
      `[Article ${i + 1}]
Title: ${a.title}
URL: ${a.url}
Content: ${a.text.slice(0, 120)}`
    )
    .join("\n\n---\n\n");

  const prompt = `Claim to fact-check:
"${claim}"

Articles to classify:
${articleList}

Classify each article as:
- SUPPORTS
- REFUTES
- UNRELATED

Return ONLY JSON array:
[
  {
    "article_index": 1,
    "stance": "SUPPORTS" | "REFUTES" | "UNRELATED",
    "confidence": 0-1,
    "reason": "short reason"
  }
]`;

  let lastError;

  // 🔥 RETRY LOGIC
const genAI = getGenAI();

const stanceModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",

  safetySettings: SAFETY_SETTINGS,

  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 128,

    responseMimeType: "application/json",

    responseSchema: {
      type: "ARRAY",

      items: {
        type: "OBJECT",

        properties: {
          article_index: {
            type: "NUMBER",
          },

          stance: {
            type: "STRING",
          },

          confidence: {
            type: "NUMBER",
          },

          reason: {
            type: "STRING",
          },
        },

        required: [
          "article_index",
          "stance",
          "confidence",
          "reason",
        ],
      },
    },
  },

  systemInstruction: `
You are a stance detection system for a news fact-checking pipeline.

Allowed stance values:
- SUPPORTS
- REFUTES
- UNRELATED

Return ONLY a valid JSON array.
No markdown.
No explanations outside JSON.
`,
});

for (let attempt = 1; attempt <= 2; attempt++) {

  try {

    console.log(
      "🚀 Sending stance batch to Gemini..."
    );

    console.log(
      "Articles count:",
      articles.length
    );

   
      const result = await stanceModel.generateContent(prompt);

      const raw = result?.response?.text();

      // ❌ empty response fix
      if (!raw || !raw.trim()) {
        throw new Error("Empty Gemini response");
      }

      const clean = raw.replace(/```json|```/g, "").trim();

      let parsed;

try {
  parsed = JSON.parse(clean);

} catch {

  const match = clean.match(/\[[\s\S]*\]/);

  if (!match) {
    throw new Error("No JSON array found");
  }

  parsed = JSON.parse(match[0]);
}

      if (!Array.isArray(parsed)) {
        throw new Error("Invalid JSON format");
      }

      return parsed.map((item, idx) => ({
        url: articles[idx]?.url || "",
        stance: ["SUPPORTS", "REFUTES", "UNRELATED"].includes(
          item.stance?.toUpperCase()
        )
          ? item.stance.toUpperCase()
          : "UNRELATED",
        confidence: clamp(
          typeof item.confidence === "number" ? item.confidence : 0.5
        ),
        reason: typeof item.reason === "string" ? item.reason : "",
      }));

    } catch (err) {
      lastError = err;
      if (
  err.message?.includes("429") ||
  err.message?.includes("quota")
) {
  console.warn(
    "⚠️ Gemini quota exceeded"
  );
}
      console.warn(
        `⚠️ Stance detection attempt ${attempt} failed:`,
        err.message
      );

      if (attempt < 2) {
        const delay = 2000 * Math.pow(2, attempt - 1);

console.log(
  `⏳ Waiting ${delay}ms before retry...`
);

await new Promise((r) =>
  setTimeout(r, delay)
); // retry delay
      }
    }
  }

  // 🔥 SAFE FALLBACK (VERY IMPORTANT)
  console.warn("❌ Stance detection completely failed → fallback");

  return articles.map((a) => ({
    url: a.url,
    stance: "UNRELATED",
    confidence: 0.2, // ✅ NOT ZERO (fixes scoring issue)
    reason: "Fallback due to AI failure",
  }));
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * For a single sub-claim, fetch full article text for the top N articles,
 * run stance detection, compute weighted credibility score.
 *
 * @param {string} claim       - The (sub-)claim being checked
 * @param {object[]} articles  - Pre-deduplicated, trust-sorted articles from server.js
 * @returns {Promise<StanceResult>}
 *
 * @typedef {object} StanceResult
 * @property {number} weightedSupports
 * @property {number} weightedRefutes
 * @property {number} sourcesChecked
 * @property {object} trustedSources   - grouped by outlet key, each article has .stance
 * @property {object[]} otherSources
 * @property {object} stanceSummary    - { supports, refutes, unrelated } counts
 */
export async function detectStanceForArticles(claim, articles) {
  if (!articles.length) {
    return {
      weightedSupports: 0,
      weightedRefutes: 0,
      sourcesChecked: 0,
      trustedSources: {},
      otherSources: [],
      stanceSummary: { supports: 0, refutes: 0, unrelated: 0 },
    };
  }

  // Take top N articles to keep Gemini prompt manageable
  const topArticles = articles.slice(0, TOP_N_FOR_STANCE);

  // Fetch full article text in parallel
  console.info(`📥 Fetching full text for ${topArticles.length} articles…`);
  const withText = await Promise.all(
    topArticles.map(async (article) => {
      const url = article.url || article.link || "";
      const text = await fetchArticleText(
        url,
        article.title || "",
        article.description || ""
      );
      return {
        ...article,
        url,
        text,
      };
    })
  );

  // Run Gemini stance detection (single batched call)
  console.info(`🔬 Detecting stance for ${withText.length} articles on: "${claim.slice(0, 60)}…"`);
  const stanceResults = await batchDetectStance(claim, withText);

  // Merge stance data back into articles and compute score
  let weightedSupports = 0;
  let weightedRefutes = 0;
  const stanceSummary = { supports: 0, refutes: 0, unrelated: 0 };

  const enrichedArticles = withText.map((article, idx) => {
    const stanceData = stanceResults[idx] || { stance: "UNRELATED", confidence: 0, reason: "" };
    const rawSource = article.source?.name || article.source || "";
    const trustedKey = normalizeTrustedSource(rawSource, article.url);
    const isTrusted = trustedKey !== null;
    const weight = isTrusted ? TRUSTED_SOURCE_WEIGHT : 1.0;

    // Accumulate weighted counts
    if (stanceData.stance === "SUPPORTS") {
      weightedSupports += weight * stanceData.confidence;
      stanceSummary.supports++;
    } else if (stanceData.stance === "REFUTES") {
      weightedRefutes += weight * stanceData.confidence;
      stanceSummary.refutes++;
    } else {
      stanceSummary.unrelated++;
    }

    return {
      title: article.title || "",
      url: article.url,
      source: rawSource,
      normalizedSource: trustedKey,
      publishedAt: article.publishedAt || null,
      stance: stanceData.stance,
      stanceConfidence: stanceData.confidence,
      stanceReason: stanceData.reason,
      isTrusted,
    };
  });

  // Group trusted sources (up to MAX_PER_TRUSTED_SOURCE articles per outlet)
  const groupedTrusted = {};
  for (const article of enrichedArticles) {
    if (!article.isTrusted) continue;
    const key = article.normalizedSource;
    if (!groupedTrusted[key]) groupedTrusted[key] = [];
    if (groupedTrusted[key].length < MAX_PER_TRUSTED_SOURCE) {
      groupedTrusted[key].push(article);
    }
  }

  // Other sources (non-trusted), up to limit
  const otherSources = enrichedArticles
    .filter((a) => !a.isTrusted)
    .slice(0, MAX_OTHER_SOURCES);

  console.log(
    `📊 Stance — supports: ${stanceSummary.supports}, refutes: ${stanceSummary.refutes}, unrelated: ${stanceSummary.unrelated}`
  );
  console.log(
    `📊 Weighted — supports: ${weightedSupports.toFixed(3)}, refutes: ${weightedRefutes.toFixed(3)}`
  );

  return {
    weightedSupports,
    weightedRefutes,
    sourcesChecked: articles.length,
    trustedSources: groupedTrusted,
    otherSources,
    stanceSummary,
  };
}