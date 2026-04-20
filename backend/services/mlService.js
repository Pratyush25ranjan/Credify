import natural from "natural";

// 🔥 Cosine similarity
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

// 🔥 STRONGER normalization
function normalizeSource(sourceName) {
  const clean = (sourceName || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "") // remove symbols
    .trim();

  if (!clean) return null;

  if (clean.includes("reuters")) return "reuters";
  if (clean.includes("bbc")) return "bbc";
  if (clean.includes("associated press") || clean.includes("ap"))
    return "ap";
  if (clean.includes("new york times") || clean.includes("nyt"))
    return "nyt";
  if (clean.includes("al jazeera"))
    return "aljazeera";

  return null;
}

export function analyzeNews(text, articles) {
  const stopWords = ["the", "is", "in", "at", "of", "on", "and", "a", "to"];

  const keywords = text
    .toLowerCase()
    .split(" ")
    .filter((w) => !stopWords.includes(w) && w.length > 2);

  const tfidf = new natural.TfIdf();
  const query = text.toLowerCase().trim();

  tfidf.addDocument(query);
  articles.forEach((a) => tfidf.addDocument(a.title || ""));

  const queryVector = tfidf.listTerms(0).map((t) => t.tfidf);

  // ==============================
  // 🔥 SCORING
  // ==============================

  const scored = articles.map((article, index) => {
    const title = article.title?.toLowerCase() || "";

    // ✅ FIXED SOURCE EXTRACTION
    const rawSource =
      article.source?.name || article.source || "";

    const normalized = normalizeSource(rawSource);
    const isTrusted = normalized !== null;

    // 🔹 Keyword score
    let matchScore = 0;
    keywords.forEach((word) => {
      if (title.includes(word)) matchScore++;
    });

    let keywordScore = keywords.length
      ? matchScore / keywords.length
      : 0;

    // 🔹 Semantic score
    const articleVector = tfidf
      .listTerms(index + 1)
      .map((t) => t.tfidf);

    const semanticScore = cosineSimilarity(queryVector, articleVector);

    let score = (0.6 * semanticScore) + (0.4 * keywordScore);

    if (isTrusted) score += 0.1;

    score = Math.min(score, 0.95);

    return {
      title: article.title,
      url: article.url,
      source: rawSource,
      normalized_source: normalized,
      publishedAt: article.publishedAt || null,
      score,
      is_trusted: isTrusted,
    };
  });

  // 🔥 Sort all
  scored.sort((a, b) => b.score - a.score);

  // ==============================
  // 🔥 GROUP TRUSTED
  // ==============================

  const groupedTrusted = {};

  scored.forEach((article) => {
    if (article.is_trusted) {
      const key = article.normalized_source;

      if (!groupedTrusted[key]) {
        groupedTrusted[key] = [];
      }

      groupedTrusted[key].push(article);
    }
  });

  // 🔥 Limit 3 per source
  Object.keys(groupedTrusted).forEach((key) => {
    groupedTrusted[key] = groupedTrusted[key]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  });

  // ==============================
  // 🔥 OTHER SOURCES
  // ==============================

  const otherSources = scored
    .filter((a) => !a.is_trusted)
    .slice(0, 5);

  // ==============================
  // 🔥 FINAL SCORE
  // ==============================

  const topArticles = scored.slice(0, 3);

  const avgScore =
    topArticles.reduce((sum, a) => sum + a.score, 0) /
    (topArticles.length || 1);

  // ==============================
  // 🔥 DEBUG (VERY IMPORTANT)
  // ==============================

  console.log("Trusted groups:", Object.keys(groupedTrusted));
  console.log("Total articles analyzed:", articles.length);

  // ==============================
  // 🔥 RESPONSE
  // ==============================

  return {
    credibilityScore: avgScore,
    trustedMatches: Object.keys(groupedTrusted).length,
    sourcesChecked: articles.length,
    trustedSources: groupedTrusted,
    otherSources: otherSources,
  };
}