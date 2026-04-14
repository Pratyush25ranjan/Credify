// backend/server.js
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import natural from "natural";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// 🔥 In-memory cache
const cache = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// 🔥 Cosine similarity function
function cosineSimilarity(vecA, vecB) {
  let dot = 0.0, normA = 0.0, normB = 0.0;

  for (let i = 0; i < Math.max(vecA.length, vecB.length); i++) {
    const a = vecA[i] || 0;
    const b = vecB[i] || 0;

    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// Root route
app.get("/", (req, res) => {
  res.send("Credify API is running 🚀");
});

// Main API
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

    // 🔥 GNews first
    const gnewsRes = await axios.get(
      `https://gnews.io/api/v4/search?q=${text}&lang=en&apikey=${process.env.GNEWS_API_KEY}`
    );

    articles = gnewsRes.data.articles || [];

    console.log("GNews articles:", articles.length);

    // 🔥 fallback
    if (articles.length < 3) {
      const newsapiRes = await axios.get(
        `https://newsapi.org/v2/everything?q=${text}&apiKey=${process.env.NEWS_API_KEY}`
      );

      const extraArticles = newsapiRes.data.articles || [];

      console.log("NewsAPI articles:", extraArticles.length);

      articles = [...articles, ...extraArticles];
    }

    articles = articles.slice(0, 10);

    // ==============================
    // 🔥 YOUR EXISTING LOGIC (KEPT)
    // ==============================

    const stopWords = ["the", "is", "in", "at", "of", "on", "and", "a", "to"];

    const keywords = text
      .toLowerCase()
      .split(" ")
      .filter((w) => !stopWords.includes(w) && w.length > 2);

    const trustedSources = [
      "bbc",
      "reuters",
      "the hindu",
      "indian express",
      "ndtv",
    ];

    // ==============================
    // 🔥 NEW: TF-IDF (Embedding-like)
    // ==============================

    const tfidf = new natural.TfIdf();

    tfidf.addDocument(query); // query
    articles.forEach((a) => tfidf.addDocument(a.title || ""));

    const queryVector = tfidf.listTerms(0).map((t) => t.tfidf);

    // ==============================
    // 🔥 COMBINED SCORING
    // ==============================

    const scored = articles.map((article, index) => {
      const title = article.title?.toLowerCase() || "";
      const sourceName = article.source?.name?.toLowerCase() || "";

      // 🔹 Keyword score (your logic)
      let matchScore = 0;

      keywords.forEach((word) => {
        if (title.includes(word)) {
          matchScore += 1;
        }
      });

      let keywordScore = keywords.length
        ? matchScore / keywords.length
        : 0;

      // 🔹 Semantic score (NEW)
      const articleVector = tfidf
        .listTerms(index + 1)
        .map((t) => t.tfidf);

      const semanticScore = cosineSimilarity(queryVector, articleVector);

      // 🔹 Combine both (IMPORTANT)
      let score = (0.6 * semanticScore) + (0.4 * keywordScore);

      // 🔹 Boost trusted sources
      if (trustedSources.some((src) => sourceName.includes(src))) {
        score += 0.1;
      }

      score = Math.min(score, 0.95);

      return {
        title: article.title,
        url: article.url,
        source: article.source?.name,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const topArticles = scored.slice(0, 3);

    const avgScore =
      topArticles.reduce((sum, a) => sum + a.score, 0) /
      (topArticles.length || 1);

    const responseData = {
      credibilityScore: avgScore,
      articles: scored.slice(0, 5),
    };

    // 🔥 Save cache
    cache[query] = {
      data: responseData,
      time: Date.now(),
    };

    console.log("Saved to cache 💾");

    res.json(responseData);

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
