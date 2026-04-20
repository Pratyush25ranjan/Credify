import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ArticleList({ articles }) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="space-y-2">
      {articles.map((article, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
        >
          {article.status === 'verified' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{article.title}</p>
            <p className="text-xs text-muted-foreground">{article.date}</p>
          </div>
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            article.status === 'verified'
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          )}>
            {article.status === 'verified' ? 'Verified' : 'Suspicious'}
          </span>
        </div>
      ))}
    </div>
  );
}