// backend/server.js
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// 🔥 In-memory cache
const cache = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

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

  // 🔥 1️⃣ Check cache
  if (cache[query]) {
    const { data, time } = cache[query];

    // check expiry
    if (Date.now() - time < CACHE_DURATION) {
      console.log("Serving from cache ✅");
      return res.json(data);
    } else {
      console.log("Cache expired ⏳");
      delete cache[query];
    }
  }

  try {
    let articles = [];

    // 🔥 2️⃣ Call GNews first
    const gnewsRes = await axios.get(
      `https://gnews.io/api/v4/search?q=${text}&lang=en&apikey=${process.env.GNEWS_API_KEY}`
    );

    articles = gnewsRes.data.articles || [];

    console.log("GNews articles:", articles.length);

    // 🔥 3️⃣ Fallback to NewsAPI if needed
    if (articles.length < 3) {
      const newsapiRes = await axios.get(
        `https://newsapi.org/v2/everything?q=${text}&apiKey=${process.env.NEWS_API_KEY}`
      );

      const extraArticles = newsapiRes.data.articles || [];

      console.log("NewsAPI articles:", extraArticles.length);

      articles = [...articles, ...extraArticles];
    }

    // limit results
    articles = articles.slice(0, 10);

    // 🔥 Scoring logic
    const words = text.toLowerCase().split(" ");

    const scored = articles.map((article) => {
      const title = article.title?.toLowerCase() || "";

      const matchCount = words.filter((w) => title.includes(w)).length;

      const score = Math.min(matchCount / words.length, 0.85);

      return {
        title: article.title,
        url: article.url,
        source: article.source?.name,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const responseData = {
      credibilityScore: scored[0]?.score || 0,
      articles: scored.slice(0, 5),
    };

    // 🔥 4️⃣ Save to cache
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
