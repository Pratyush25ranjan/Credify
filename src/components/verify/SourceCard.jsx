import { ExternalLink, Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SourceCard({ source }) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-md",
      source.is_trusted
        ? "bg-emerald-50/50 border-emerald-200/60"
        : "bg-amber-50/50 border-amber-200/60"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
        source.is_trusted ? "bg-emerald-100" : "bg-amber-100"
      )}>
        {source.is_trusted
          ? <Shield className="w-4 h-4 text-emerald-600" />
          : <AlertCircle className="w-4 h-4 text-amber-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            source.is_trusted ? "text-emerald-600" : "text-amber-600"
          )}>
            {source.is_trusted ? 'Trusted' : 'Unverified'}
          </span>
        </div>
        <p className="font-medium text-foreground text-sm leading-snug mb-1 truncate">{source.title}</p>
        <p className="text-xs text-muted-foreground">{source.name}</p>
      </div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}