export const analyzeNewsAPI = async (text) => {
  try {
    const res = await fetch(
      "https://credify-eg2e.onrender.com/verify-news",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    );

    const data = await res.json();

    // Convert backend response → UI format
    return {
      status:
        data.credibilityScore > 0.7
          ? "Real ✅"
          : data.credibilityScore > 0.4
          ? "Partially True ⚠️"
          : "Fake ❌",

      reason: `Matched with ${data.articles.length} news sources`,

      trustedMatches: data.articles.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source,
        score: a.score,
      })),

      otherMatches: [],
    };
  } catch (error) {
    console.error("API Error:", error);

    return {
      status: "Error ❌",
      reason: "Failed to connect to server",
      trustedMatches: [],
      otherMatches: [],
    };
  }
};