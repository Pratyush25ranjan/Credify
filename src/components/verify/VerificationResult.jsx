import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, FileText, Brain } from 'lucide-react';
import VerdictBadge from './VerdictBadge';
import SourceCard from './SourceCard';

export default function VerificationResult({ result }) {
  if (!result) return null;

  const trustedSources = result.sources?.filter(s => s.is_trusted) || [];
  const otherSources = result.sources?.filter(s => !s.is_trusted) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto mt-10 space-y-6"
    >
      {/* Verdict */}
      <Card className="overflow-hidden border-0 shadow-xl shadow-black/5">
        <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div>
              <p className="text-sm text-muted-foreground mb-2 font-medium">
                Verification Result
              </p>
              <VerdictBadge verdict={result.verdict || "Unknown"} large />
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Confidence</p>
              <p className="text-3xl font-display font-bold text-foreground">
                {result.confidence_score ?? 0}%
              </p>
            </div>

          </div>

          <div className="mt-6">
            <Progress value={result.confidence_score ?? 0} className="h-2" />
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: Shield,
            label: 'Trusted Matches',
            value: result.trusted_matches ?? 0,
            color: 'text-emerald-500'
          },
          {
            icon: FileText,
            label: 'Sources Checked',
            value: result.total_sources_checked ?? 0,
            color: 'text-primary'
          },
          {
            icon: Brain,
            label: 'AI Confidence',
            value: `${result.confidence_score ?? 0}%`,
            color: 'text-accent'
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md shadow-black/5">
            <CardContent className="p-4 text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-display font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Explanation */}
      <Card className="border-0 shadow-md shadow-black/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">
              AI Analysis
            </h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {result.explanation || "No explanation available"}
          </p>
        </CardContent>
      </Card>

      {/* Sources */}
      {(trustedSources.length > 0 || otherSources.length > 0) && (
        <Card className="border-0 shadow-md shadow-black/5">
          <CardContent className="p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">
              Sources Found
            </h3>
            <div className="space-y-3">
              {trustedSources.map((s, i) => (
                <SourceCard key={`t-${i}`} source={s} />
              ))}
              {otherSources.map((s, i) => (
                <SourceCard key={`o-${i}`} source={s} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}