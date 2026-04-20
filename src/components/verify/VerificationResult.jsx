import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, FileText, Brain } from 'lucide-react';
import { useState } from 'react';

import VerdictBadge from './VerdictBadge';
import SourceCard from './SourceCard';

export default function VerificationResult({ result }) {
  const [activeTab, setActiveTab] = useState("trusted");

  if (!result) return null;

  console.log("FULL RESULT:", result);

  // ✅ Correct structure
  const trustedSources = result.trustedSources || {};
  const otherSources = result.otherSources || [];

  const confidence = Math.round((result.credibilityScore || 0) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto mt-10 space-y-6"
    >

      {/* 🔹 TOP CARD */}
      <Card className="border-0 shadow-xl shadow-black/5">
        <div className="p-6">

          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Verification Result
              </p>
              <VerdictBadge verdict={result.verdict || "Unknown"} large />
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">Confidence</p>
              <p className="text-3xl font-bold">
                {confidence}%
              </p>
            </div>
          </div>

          <Progress value={confidence} className="mt-4 h-2" />
        </div>
      </Card>

      {/* 🔹 STATS */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: Shield,
            label: 'Trusted Matches',
            value: result.trustedMatches ?? 0,
            color: 'text-emerald-500'
          },
          {
            icon: FileText,
            label: 'Sources Checked',
            value: result.sourcesChecked ?? 0,
            color: 'text-primary'
          },
          {
            icon: Brain,
            label: 'AI Confidence',
            value: `${confidence}%`,
            color: 'text-accent'
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 🔥 MAIN BOX */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">

          {/* 🔹 Tabs */}
          <div className="flex border-b mb-4">
            {[
              { key: "trusted", label: "Trusted Sources" },
              { key: "other", label: "Other Sources" },
              { key: "ai", label: "AI Confidence" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === tab.key
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 🔹 Trusted Sources */}
          {activeTab === "trusted" && (
            <div className="space-y-4">

              {Object.keys(trustedSources).length === 0 && (
                <p className="text-muted-foreground">
                  No trusted sources found
                </p>
              )}

              {Object.entries(trustedSources).map(([sourceKey, articles]) => (
                <div key={sourceKey}>
                  <h3 className="font-semibold capitalize mb-2">
                    {sourceKey}
                  </h3>

                  <div className="space-y-3">
                    {articles.map((s, i) => (
                      <SourceCard key={`t-${sourceKey}-${i}`} source={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 🔹 Other Sources */}
          {activeTab === "other" && (
            <div className="space-y-3">
              {otherSources.length === 0 && (
                <p className="text-muted-foreground">
                  No other sources found
                </p>
              )}

              {otherSources.map((s, i) => (
                <SourceCard key={`o-${i}`} source={s} />
              ))}
            </div>
          )}

          {/* 🔹 AI Section */}
          {activeTab === "ai" && (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-xl">
                <p className="font-semibold mb-2">
                  Verdict: {result.ai?.verdict || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.ai?.explanation || "No explanation available"}
                </p>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

    </motion.div>
  );
}