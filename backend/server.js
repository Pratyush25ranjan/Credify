// backend/server.js
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.post("/verify-news", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    const gnewsRes = await axios.get(
      `https://gnews.io/api/v4/search?q=${text}&lang=en&apikey=${process.env.GNEWS_API_KEY}`
    );

    const newsapiRes = await axios.get(
      `https://newsapi.org/v2/everything?q=${text}&apiKey=${process.env.NEWS_API_KEY}`
    );

    const articles = [
      ...gnewsRes.data.articles,
      ...newsapiRes.data.articles,
    ];

    const words = text.toLowerCase().split(" ");

    const scored = articles.map((article) => {
      const title = article.title?.toLowerCase() || "";

      const score =
        words.filter((w) => title.includes(w)).length / words.length;

      return {
        title: article.title,
        url: article.url,
        source: article.source?.name,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    res.json({
      credibilityScore: scored[0]?.score || 0,
      articles: scored.slice(0, 5),
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});