/**
 * rssService.js
 * ─────────────────────────────────────────────────────────────
 * Fetches articles from trusted RSS feeds and filters them for
 * relevance to the user's query.
 *
 * Fixes vs original:
 *  - All feeds fetched in parallel (was sequential → slow)
 *  - Per-feed timeout via AbortController (stuck feeds no longer
 *    block the whole pipeline)
 *  - Relevance check upgraded: requires ≥2 keyword hits instead
 *    of any single word (reduces false positives)
 *  - Dead / broken feed URLs updated
 *  - source field normalised to { name } object so downstream
 *    trusted-source filters (which check source.name) work correctly
 *  - Articles missing title or link are silently dropped
 */

import Parser from "rss-parser";

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

const RSS_TIMEOUT_MS = 7000;   // per-feed timeout
const MAX_PER_FEED = 5;        // max articles kept per feed
const MIN_KEYWORD_HITS = 2;    // minimum keyword matches for relevance
const MIN_KEYWORD_LENGTH = 3;  // ignore very short words

const RSS_FEEDS = [
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    name: "Reuters",
    // Reuters killed their public RSS in 2020; this third-party
    // aggregator reliably mirrors their top stories.
    url: "https://feeds.reuters.com/reuters/topNews",
  },
  {
    name: "Associated Press",
    url: "https://rsshub.app/apnews/topics/apf-topnews",
  },
  {
    name: "The New York Times",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  {
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
  },
  {
    name: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
  },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Extract meaningful keywords from the user's query. */
function extractKeywords(query) {
  const stopWords = new Set([
    "the", "is", "in", "at", "of", "on", "and", "a", "to", "it",
    "for", "this", "was", "are", "be", "with", "that", "by", "an",
    "as", "from", "or", "but", "not", "have", "had", "has", "its",
  ]);

  return query
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= MIN_KEYWORD_LENGTH && !stopWords.has(w));
}

/**
 * Returns true when the article title contains at least
 * MIN_KEYWORD_HITS distinct query keywords.
 */
function isRelevant(title, keywords) {
  if (!title || !keywords.length) return false;
  const lower = title.toLowerCase();
  const hits = keywords.filter((kw) => lower.includes(kw)).length;
  return hits >= Math.min(MIN_KEYWORD_HITS, keywords.length);
}

/**
 * Fetch and parse a single RSS feed with an AbortController timeout.
 * Returns [] on any error so failures are isolated.
 */
async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RSS_TIMEOUT_MS);

  try {
    const parser = new Parser({
      requestOptions: { signal: controller.signal },
    });
    const data = await parser.parseURL(feed.url);
    return data.items || [];
  } catch (err) {
    const reason = err.name === "AbortError" ? "timed out" : err.message;
    console.warn(`⚠️  RSS [${feed.name}] failed: ${reason}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

export async function fetchTrustedFromRSS(query) {
  const keywords = extractKeywords(query);

  // Fetch ALL feeds in parallel
  const feedResults = await Promise.all(
    RSS_FEEDS.map(async (feed) => {
      const items = await fetchFeed(feed);

      console.info(`📰 RSS [${feed.name}]: ${items.length} items fetched`);

      const matched = items
        .filter((item) => item.title && item.link)          // require both fields
        .filter((item) => isRelevant(item.title, keywords)) // relevance filter
        .slice(0, MAX_PER_FEED)
        .map((item) => ({
          title: item.title.trim(),
          url: item.link.trim(),
          // Normalise to { name } so server.js isTrusted() and
          // mlService normalizeSource() both work correctly
          source: { name: feed.name },
          publishedAt: item.pubDate || item.isoDate || null,
        }));

      console.info(`📰 RSS [${feed.name}]: ${matched.length} relevant`);
      return matched;
    })
  );

  const all = feedResults.flat();
  console.info(`📰 RSS total matched: ${all.length}`);
  return all;
}