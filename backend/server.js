import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

import { analyzeNews } from "./services/mlService.js";
import { analyzeWithAI } from "./services/aiService.js";
import { fetchTrustedFromRSS } from "./services/rssService.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 Cache
const cache = {};
const CACHE_DURATION = 60 * 60 * 1000;

// Root
app.get("/", (req, res) => {
  res.send("Credify API is running 🚀");
});

// API
app.post("/verify-news", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  const query = text.toLowerCase().trim();

  // 🔥 Cache check
  if (cache[query]) {
    const { data, time } = cache[query];

    if (Date.now() - time < CACHE_DURATION) {
      console.log("Serving from cache ✅");
      return res.json(data);
    } else {
      delete cache[query];
    }
  }

  try {
    let articles = [];

    // ==============================
    // 🔥 STEP 1: RSS (Trusted)
    // ==============================
    let rssArticles = [];
    try {
      rssArticles = await fetchTrustedFromRSS(text);
    } catch (err) {
      console.log("RSS failed:", err.message);
    }

    console.log("RSS:", rssArticles.length);

    // ==============================
    // 🔥 STEP 2: GNews
    // ==============================
    let gnewsArticles = [];

    // ✅ FIXED QUERY (IMPORTANT)
    const enhancedQuery = `${text} news OR oil OR iran OR shipping`;

    try {
      const gnewsRes = await axios.get(
        `https://gnews.io/api/v4/search?q=${encodeURIComponent(
          enhancedQuery
        )}&lang=en&max=50&apikey=${process.env.GNEWS_API_KEY}`
      );

      gnewsArticles = gnewsRes.data.articles || [];
    } catch (err) {
      console.log("GNews failed:", err.message);
    }

    console.log("GNews:", gnewsArticles.length);

    // ==============================
    // 🔥 STEP 3: NewsAPI
    // ==============================
    let newsApiArticles = [];

    try {
      const newsapiRes = await axios.get(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(
          enhancedQuery
        )}&pageSize=50&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`
      );

      newsApiArticles = newsapiRes.data.articles || [];
    } catch (err) {
      console.log("NewsAPI failed:", err.message);
    }

    console.log("NewsAPI:", newsApiArticles.length);

    // ==============================
    // 🔥 STEP 4: Merge ALL
    // ==============================
    articles = [
      ...rssArticles,
      ...gnewsArticles,
      ...newsApiArticles
    ];

    console.log("TOTAL MERGED:", articles.length);

    // ==============================
    // 🔥 STEP 5: Deduplicate
    // ==============================
    const seen = new Set();

    articles = articles.filter((a) => {
      if (!a.url || seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    // ==============================
    // 🔥 STEP 6: PRIORITIZE TRUSTED
    // ==============================
    const trustedArticles = articles.filter((a) => {
      const src = (a.source?.name || a.source || "").toLowerCase();

      return (
        src.includes("bbc") ||
        src.includes("reuters") ||
        src.includes("associated press") ||
        src.includes("new york times") ||
        src.includes("al jazeera")
      );
    });

    const otherArticles = articles.filter(
      (a) => !trustedArticles.includes(a)
    );

    // 🔥 FINAL POOL
    articles = [...trustedArticles, ...otherArticles].slice(0, 100);

    console.log("FINAL COUNT:", articles.length);

    console.log("SOURCES:");
    articles.forEach((a) =>
      console.log(a.source?.name || a.source)
    );

    // ==============================
    // 🔥 Safety fallback
    // ==============================
    if (!articles.length) {
      console.log("⚠️ No articles found");

      return res.json({
        credibilityScore: 0,
        trustedMatches: 0,
        sourcesChecked: 0,
        trustedSources: {},
        otherSources: [],
        ai: null,
      });
    }

    // ==============================
    // 🔥 ML Analysis
    // ==============================
    const mlResult = analyzeNews(text, articles);

    console.log("ML sources:", mlResult.sourcesChecked);

    // ==============================
    // 🔥 AI Analysis
    // ==============================
    const aiResult = await analyzeWithAI(text, articles);

    // ==============================
    // 🔥 FINAL RESPONSE
    // ==============================
    const responseData = {
      ...mlResult,
      ai: aiResult,
    };

    // Cache
    cache[query] = {
      data: responseData,
      time: Date.now(),
    };

    console.log("Saved to cache 💾");

    res.json(responseData);

  } catch (error) {
    console.error("🔥 ERROR:", error.message);

    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
});

// Start
app.listen(5000, () => {
  console.log("Server running on port 5000");
});