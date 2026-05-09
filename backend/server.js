import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { detectStanceForArticles } from "./services/mlService.js";
import { analyzeWithAI } from "./services/aiService.js";
import { fetchTrustedFromRSS } from "./services/rssService.js";

dotenv.config();

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json({ limit: "10kb" }));

// ============================================================
// CONSTANTS
// ============================================================

const PORT = process.env.PORT || 5000;
const CACHE_DURATION_MS = 60 * 60 * 1000;
const CACHE_MAX_SIZE = 200;
const AXIOS_TIMEOUT_MS = 8000;
const MAX_ARTICLES_BEFORE_STANCE = 6;
const GNEWS_MAX = 10;
const NEWSAPI_MAX = 10;

const TRUSTED_KEYWORDS = [
  "bbc",
  "reuters",
  "associated press",
  "ap news",
  "new york times",
  "nytimes",
  "al jazeera",
  "aljazeera",
  "times of india",
  "toi",
  "indian express",        // ✅ ADD THIS
  "indianexpress",         // ✅ IMPORTANT (URL form)
  "the guardian",
  "washington post",
  "bloomberg",
  "the hindu",
];

// ============================================================
// GEMINI SETUP
// ============================================================

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  
].filter(Boolean);
if (!API_KEYS.length) {
  throw new Error(
    "No Gemini API keys found"
  );
}
console.log(
  "Loaded Gemini keys:",
  API_KEYS.length
);



let currentKeyIndex = 0;

function getNextApiKey() {
  const key = API_KEYS[currentKeyIndex];

  console.log(
    "Using Gemini key:",
    currentKeyIndex + 1
  );

  currentKeyIndex =
    (currentKeyIndex + 1) % API_KEYS.length;

  return key;
}

function getGeminiModel() {
  const genAI = new GoogleGenerativeAI(
    getNextApiKey()
  );

  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
  });
}
// ============================================================
// LRU CACHE
// ============================================================

class BoundedCache {
  constructor(maxSize, ttlMs) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key, data) {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
    this.store.set(key, { data, time: Date.now() });
  }
}

const cache = new BoundedCache(CACHE_MAX_SIZE, CACHE_DURATION_MS);

// ============================================================
// HELPERS
// ============================================================

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function isTrusted(article) {
  const sourceName = (article.source?.name || "").toLowerCase();
  const url = (article.url || article.link || "").toLowerCase();

  let domain = "";
  try {
    domain = new URL(url).hostname;
  } catch {}

  const combined = `${sourceName} ${domain}`;

  return [
    // Global
    "bbc",
    "reuters",
    "apnews",
    "associated press",
    "nytimes",
    "new york times",
    "aljazeera",

    // India (🔥 FIXED)
    "times of india",
    "the times of india",
    "timesofindia",
    "indiatimes",
    "toi",

    "indian express",
    "the indian express",
    "indianexpress",

    "the hindu",
    "theguardian",
  ].some((kw) => combined.includes(kw));
}
/**
 * IMPROVEMENT 3: Claim decomposition.
 * Sends the raw claim to Gemini and asks it to break it into atomic,
 * independently verifiable sub-claims. Each sub-claim is searched
 * and verified separately — the biggest fix for complex claims.
 */

// async function decomposeClaimIntoSubClaims(claim) {
//   try {
//     const prompt = `Break this news claim into atomic, independently verifiable sub-claims.
// Each sub-claim should be a single, concrete assertion that can be searched for and verified on its own.

// Claim: "${claim}"

// Return ONLY a JSON array of strings, with no markdown or explanation:
// ["sub-claim 1", "sub-claim 2", ...]

// Rules:
// - Maximum 4 sub-claims
// - If the claim is already atomic (simple, single assertion), return it as a 1-element array
// - Each sub-claim must be a complete sentence that makes sense standalone
// - Keep them concise (under 20 words each)`;

//     const result = await getGeminiModel().generateContent(prompt);
//     const raw = result.response?.text?.() || "";

//     const clean = raw.replace(/```json|```/g, "").trim();
//     let parsed;

// try {
//   parsed = JSON.parse(clean);

// } catch {

//   const match = clean.match(/\[[\s\S]*\]/);

//   if (!match) {
//     throw new Error("No JSON array found");
//   }

//   parsed = JSON.parse(match[0]);
// }

//     if (Array.isArray(parsed) && parsed.length > 0) {
//       const subClaims = parsed
//         .filter((s) => typeof s === "string" && s.trim().length > 5)
//         .slice(0, 2);

//       console.log(`🔬 Decomposed into ${subClaims.length} sub-claim(s):`, subClaims);
//       return subClaims;
//     }
//     return [claim];
//   } catch (err) {
//     console.warn("⚠️  Claim decomposition failed, using original claim:", err.message);
//     return [claim];
//   }
// }

// async function expandQuery(query) {
//   try {
//     const prompt = `Rewrite this search query to improve news search relevance.
// Query: "${query}"
// Return ONLY the improved query, nothing else.`;

//     const result = await getGeminiModel().generateContent(prompt);
//     const expanded = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
//     const clean = expanded.replace(/^["']|["']$/g, "").trim();
//     return clean.length > 5 ? clean : query;
//   } catch (err) {
//     console.warn("⚠️  Query expansion failed:", err.message);
//     return query;
//   }
// }

function deduplicateArticles(articles) {
  const seenTitles = new Set();
  const seenUrls = new Set();

  return articles.filter((a) => {
    const url = (a.url || a.link || "").trim();
    const title = (a.title || "").toLowerCase().trim();
    if (!title || !url) return false;
    if (seenTitles.has(title) || seenUrls.has(url)) return false;
    seenTitles.add(title);
    seenUrls.add(url);
    return true;
  });
}

async function fetchGNews(query) {
  try {
    const response = await axios.get("https://gnews.io/api/v4/search", {
      params: { q: query, lang: "en", max: GNEWS_MAX, apikey: process.env.GNEWS_API_KEY },
      timeout: AXIOS_TIMEOUT_MS,
    });
    return response.data.articles || [];
  } catch (err) {
    console.warn(`⚠️  GNews failed for "${query}":`, err.message);
    return [];
  }
}

async function fetchNewsAPI(query) {
  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: { q: query, pageSize: NEWSAPI_MAX, sortBy: "publishedAt", apiKey: process.env.NEWS_API_KEY },
      timeout: AXIOS_TIMEOUT_MS,
    });
    return response.data.articles || [];
  } catch (err) {
    console.warn(`⚠️  NewsAPI failed for "${query}":`, err.message);
    return [];
  }
}

/**
 * Fetch articles for a single sub-claim using all 3 sources.
 */
async function fetchArticlesForClaim(claim) {
const rssArticles =
  await fetchTrustedFromRSS(claim).catch((err) => {
    console.warn("⚠️ RSS failed:", err.message);
    return [];
  });

// 🔥 Disable Gemini query expansion to save quota
const expandedQuery = claim;

const queries = [claim];

  const [gnewsResults, newsApiResults] = await Promise.all([
    Promise.all(queries.map(fetchGNews)),
    Promise.all(queries.map(fetchNewsAPI)),
  ]);

  const merged = [
    ...rssArticles,
    ...gnewsResults.flat(),
    ...newsApiResults.flat(),
  ];

  const deduplicated = deduplicateArticles(merged);

  const trusted = deduplicated.filter(isTrusted);
  const other = deduplicated.filter((a) => !isTrusted(a));

  return [...trusted, ...other].slice(0, MAX_ARTICLES_BEFORE_STANCE);
}

/**
 * Map stance-based score to a verdict string.
 * Score = weighted supports / (weighted supports + weighted refutes).
 */
function computeVerdictFromStanceScore(stanceScore) {
  if (stanceScore >= 0.75) return "TRUE";
  if (stanceScore >= 0.45) return "PARTIALLY TRUE";
  if (stanceScore >= 0.25) return "UNCERTAIN";
  return "FALSE";
}

// ============================================================
// ROUTES
// ============================================================

app.get("/", (_req, res) => res.send("Credify API is running 🚀"));
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.get("/test-gemini", async (req, res) => {
  try {
    const result = await getGeminiModel().generateContent(
      "Say hello"
    );

    const text = result.response.text();

    res.json({
      success: true,
      text,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
      details: err,
    });
  }
});

app.post("/verify-news", async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "No text provided" });
  }

  const trimmed = text.trim();
  if (trimmed.length < 10) return res.status(400).json({ error: "Query is too short to verify" });
  if (trimmed.length > 1000) return res.status(400).json({ error: "Query exceeds 1000 character limit" });

  const cacheKey = trimmed.toLowerCase();

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log("✅ Serving from cache");
    return res.json({ ...cached, fromCache: true });
  }

  try {
    // ── STEP 1: Decompose claim into sub-claims ───────────────
   const subClaims = [trimmed];

    // ── STEP 2: Fetch articles for EACH sub-claim ─────────────
    // Run all sub-claim fetches in parallel for speed
    console.log(`📡 Fetching articles for ${subClaims.length} sub-claim(s)...`);
    const subClaimArticleSets = await Promise.all(
      subClaims.map((sc) => fetchArticlesForClaim(sc))
    );

    // ── STEP 3: Stance detection per sub-claim ────────────────
    // detectStanceForArticles fetches full article text and runs Gemini stance labelling
    const subClaimResults = [];

for (let i = 0; i < subClaims.length; i++) {
  const result = await detectStanceForArticles(
    subClaims[i],
    subClaimArticleSets[i]
  );

  subClaimResults.push(result);

  // ⏱️ small delay to avoid rate limit
  if (i < subClaims.length - 1) {
  await new Promise((r) =>
    setTimeout(r, 3000)
  );
}
}

    // ── STEP 4: Merge sub-claim results ───────────────────────
    // Aggregate all trusted/other sources across sub-claims
    const allTrustedSources = {};
    const allOtherSources = [];
    let totalWeightedSupports = 0;
    let totalWeightedRefutes = 0;
    let totalSourcesChecked = 0;

    for (const result of subClaimResults) {
      totalWeightedSupports += result.weightedSupports;
      totalWeightedRefutes += result.weightedRefutes;
      totalSourcesChecked += result.sourcesChecked;

      // Merge trusted source groups
      for (const [key, articles] of Object.entries(result.trustedSources)) {
        if (!allTrustedSources[key]) allTrustedSources[key] = [];
        allTrustedSources[key].push(...articles);
        // Cap per source
        allTrustedSources[key] = allTrustedSources[key].slice(0, 3);
      }

      allOtherSources.push(...result.otherSources);
    }

    // Final credibility score from stance ratio
    const denominator = totalWeightedSupports + totalWeightedRefutes;
    const credibilityScore = denominator > 0
      ? clamp(totalWeightedSupports / denominator)
      : 0.5; // truly neutral if no evidence either way

    const verdict = computeVerdictFromStanceScore(credibilityScore);

    // ── STEP 5: AI synthesis (now uses full article text) ──────
   // 🔥 FIX 4: Skip AI if no meaningful evidence
// ── STEP 5: AI synthesis ─────────────────────────────

// 🔍 DEBUG: See what we are sending to AI
console.log("📤 CALLING AI WITH:");
console.log({
  trustedSourcesCount: Object.keys(allTrustedSources).length,
  otherSourcesCount: allOtherSources.length,
  subClaimsCount: subClaims.length,
  credibilityScore,
});

let aiResult;

try {

  // 🔥 Skip AI if not enough useful evidence
  if (
    Object.keys(allTrustedSources).length === 0 &&
    allOtherSources.length < 2
  ) {

    console.log(
      "⚠️ No usable evidence → skipping AI"
    );

    aiResult = {
      verdict: "UNCERTAIN",
      confidence: 0.5,
      explanation:
        "Not enough reliable evidence to perform AI verification.",
      sources: [],
    };

  // 🔥 Skip expensive AI synthesis if stance already decisive
  } else if (
    credibilityScore >= 0.85 ||
    credibilityScore <= 0.15
  ) {

    console.log(
      "⚡ Strong stance evidence → skipping AI synthesis"
    );

    aiResult = {
      verdict,
      confidence: credibilityScore,
      explanation:
        "Verdict derived directly from weighted stance evidence.",
      sources: [],
    };

  } else {

    // ✅ Normal AI execution
    console.log("🤖 Running AI analysis...");

    aiResult = await analyzeWithAI(trimmed, {
      subClaims,
      subClaimResults,
      trustedSources: allTrustedSources,
      otherSources: [],
      credibilityScore,
    });

    console.log(
      "✅ AI RESULT:",
      aiResult
    );
  }

} catch (err) {

  console.error(
    "🔥 AI FAILED:",
    err.message
  );

  aiResult = {
    verdict: "UNCERTAIN",
    confidence: 0.5,
    explanation:
      "AI analysis failed due to rate limit, quota, or request size. Please try again.",
    sources: [],
  };
}
    // ── STEP 6: Build & cache response ────────────────────────
    const responseData = {
      credibilityScore,
      verdict,
      explanation: aiResult.explanation || null,
      subClaims,
      subClaimResults: subClaimResults.map((r, i) => ({
        claim: subClaims[i],
        verdict: computeVerdictFromStanceScore(
          r.weightedSupports + r.weightedRefutes > 0
            ? r.weightedSupports / (r.weightedSupports + r.weightedRefutes)
            : 0.5
        ),
        stanceSummary: r.stanceSummary,
      })),
      trustedMatches: Object.keys(allTrustedSources).length,
      sourcesChecked: totalSourcesChecked,
      trustedSources: allTrustedSources,
      otherSources: [],
      ai: aiResult,
      fromCache: false,
    };

    cache.set(cacheKey, responseData);
    console.log("💾 Saved to cache");

    return res.json(responseData);
  } catch (error) {
    console.error("🔥 Unhandled error in /verify-news:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

const server = app.listen(PORT, () => {
  console.log(`🚀 Credify server running on port ${PORT}`);
});

function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));