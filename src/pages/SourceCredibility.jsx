import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import CredibilityGauge from '../components/credibility/CredibilityGauge';
import ArticleList from '../components/credibility/ArticleList';

import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function SourceCredibility() {
  const [sourceName, setSourceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!sourceName.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      // ✅ CALL YOUR BACKEND
      const res = await fetch("http://localhost:5000/analyze-source", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: sourceName }),
      });

      const data = await res.json();

      setResult(data);

      // ✅ SAVE TO FIREBASE
      await addDoc(collection(db, "sourceCredibility"), {
        source_name: data.source_name || sourceName,
        credibility_score: data.credibility_score,
        total_articles: data.total_articles,
        verified_articles: data.verified_articles,
        suspicious_articles: data.suspicious_articles,
        category: data.category,
        created_date: new Date().toISOString(),
      });

    } catch (error) {
      console.error(error);
    }

    setIsLoading(false);
  };

  const popularSources = ['Reuters', 'BBC News', 'Fox News', 'Al Jazeera', 'The Sun', 'RT News'];

  return (
    <div className="py-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            Source Analysis
          </div>

          <h1 className="text-4xl font-bold mb-4">
            Source Credibility
          </h1>

          <p className="text-gray-500 max-w-2xl mx-auto">
            Evaluate trustworthiness of any news source.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="max-w-xl mx-auto flex gap-3 mb-6">
          <Input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Enter a news source name..."
            className="h-12"
          />
          <Button type="submit" disabled={!sourceName || isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </form>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {popularSources.map((s) => (
            <button
              key={s}
              onClick={() => setSourceName(s)}
              className="px-3 py-1 rounded bg-gray-100"
            >
              {s}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Loader */}
      {isLoading && (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="animate-spin w-8 h-8" />
          <p>Analyzing...</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CredibilityGauge score={result.credibility_score} />

            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold">
                  {result.source_name || sourceName}
                </h3>

                <div className="flex gap-4 text-sm mt-3 mb-4">
                  <span>{result.total_articles} articles</span>
                  <span className="text-green-500">{result.verified_articles} verified</span>
                  <span className="text-red-500">{result.suspicious_articles} suspicious</span>
                </div>

                <p className="text-gray-600">{result.analysis}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Recent Articles</h3>
              <ArticleList articles={result.articles} />
            </CardContent>
          </Card>

        </motion.div>
      )}
    </div>
  );
}