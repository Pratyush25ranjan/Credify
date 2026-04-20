import { useState, useEffect } from 'react';

import { motion } from 'framer-motion';
import { Newspaper, RefreshCw, ExternalLink, Loader2, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const CATEGORIES = ['Top Stories', 'Politics', 'Technology', 'Science', 'Health', 'Business'];

export default function TrendingNews() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Top Stories');

  const fetchNews = async (category) => {
    setIsLoading(true);
    setArticles([]);

    // ✅ REPLACED BASE44 WITH BACKEND CALL
    const result = await fetch("http://localhost:5000/trending-news", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category }),
    }).then(res => res.json());

    setArticles(result.articles || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNews(activeCategory);
  }, [activeCategory]);

  const categoryColors = {
    'Top Stories': 'bg-primary/10 text-primary',
    'Politics': 'bg-blue-100 text-blue-700',
    'Technology': 'bg-violet-100 text-violet-700',
    'Science': 'bg-emerald-100 text-emerald-700',
    'Health': 'bg-rose-100 text-rose-700',
    'Business': 'bg-amber-100 text-amber-700',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Trending News</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-11">Live headlines from trusted global sources</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchNews(activeCategory)}
          disabled={isLoading}
          className="rounded-xl gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-card text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Fetching latest {activeCategory} headlines...</p>
        </div>
      )}

      {/* Articles Grid */}
      {!isLoading && articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((article, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow h-full group">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[article.category] || categoryColors['Top Stories']}`}>
                      {article.category || activeCategory}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {article.published_at || 'Just now'}
                    </div>
                  </div>

                  <h3 className="font-display font-semibold text-foreground text-base leading-snug mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                    {article.summary}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Newspaper className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{article.source}</span>
                    </div>
                    {article.url && article.url.startsWith('http') && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        Read more <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && articles.length === 0 && (
        <div className="text-center py-24 text-muted-foreground">
          <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No articles found. Try refreshing.</p>
        </div>
      )}
    </motion.div>
  );
}