export const analyzeNewsAPI = async (text) => {
  try {
    const res = await fetch(
      "http://localhost:5000/verify-news", // ✅ FIXED
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    );

    const data = await res.json();

    return {
      status:
        data.credibilityScore > 0.7
          ? "Real ✅"
          : data.credibilityScore > 0.4
          ? "Partially True ⚠️"
          : "Fake ❌",

      reason: `Matched with ${data.sourcesChecked} sources`, // ✅ better field

      trustedMatches: Object.values(data.trustedSources || {}).flat().map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source,
        score: a.score,
      })),

      otherMatches: data.otherSources || [],
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