const axios = require("axios");
const cors = require("cors")({ origin: true });

exports.verifyNews = onRequest((req, res) => {
  cors(req, res, async () => {
    const text = req.body.text;

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
});