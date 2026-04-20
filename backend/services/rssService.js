import Parser from "rss-parser";

const parser = new Parser();

// 🔥 Trusted RSS feeds
const RSS_FEEDS = [
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml" },
  { name: "Reuters", url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best" },
  { name: "Associated Press", url: "https://apnews.com/rss" },
  { name: "The New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" }
];

// 🔥 Improved relevance check
function isRelevant(title, query) {
  if (!title) return false;

  const cleanTitle = title.toLowerCase();

  // 🔹 Break query into keywords
  const words = query
    .toLowerCase()
    .split(" ")
    .filter(w => w.length > 3); // ignore small words

  // 🔹 Match ANY keyword (not full sentence)
  return words.some(word => cleanTitle.includes(word));
}

export async function fetchTrustedFromRSS(query) {
  const results = [];

  for (const feed of RSS_FEEDS) {
    try {
      const data = await parser.parseURL(feed.url);

      console.log(`RSS fetched from ${feed.name}:`, data.items?.length || 0);

      const matched = (data.items || [])
        .filter(item => isRelevant(item.title, query))
        .slice(0, 3) // max 3 per source
        .map(item => ({
          title: item.title,
          url: item.link,
          source: feed.name,
          publishedAt: item.pubDate || null
        }));

      console.log(`Matched from ${feed.name}:`, matched.length);

      results.push(...matched);

    } catch (err) {
      console.log("RSS error:", feed.name, err.message);
    }
  }

  console.log("TOTAL RSS MATCHED:", results.length);

  return results;
}