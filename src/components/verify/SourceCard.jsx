import { Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// 🔥 Source logos (based on normalized_source)
const sourceLogos = {
  bbc: "https://logo.clearbit.com/bbc.com",
  reuters: "https://logo.clearbit.com/reuters.com",
  ap: "https://logo.clearbit.com/apnews.com",
  nyt: "https://logo.clearbit.com/nytimes.com",
  aljazeera: "https://logo.clearbit.com/aljazeera.com"
};

export default function SourceCard({ source }) {
  // ✅ Safe date formatting
  const formattedDate = source.publishedAt
    ? new Date(source.publishedAt).toDateString()
    : "Unknown date";

  const logo = sourceLogos[source.normalized_source];

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-xl border transition-all hover:shadow-md",
        source.is_trusted
          ? "bg-emerald-50/50 border-emerald-200/60"
          : "bg-amber-50/50 border-amber-200/60"
      )}
    >
      {/* LEFT SECTION */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        
        {/* ICON / LOGO */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden",
            source.is_trusted ? "bg-emerald-100" : "bg-amber-100"
          )}
        >
          {logo ? (
            <img
              src={logo}
              alt={source.source}
              className="w-5 h-5 object-contain"
            />
          ) : source.is_trusted ? (
            <Shield className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600" />
          )}
        </div>

        {/* TEXT */}
        <div className="flex-1 min-w-0">
          
          {/* TAG */}
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              source.is_trusted ? "text-emerald-600" : "text-amber-600"
            )}
          >
            {source.is_trusted ? "Trusted" : "Unverified"}
          </span>

          {/* TITLE */}
          <p className="font-medium text-sm leading-snug mt-1 line-clamp-2">
            {source.title || "No title available"}
          </p>

          {/* SOURCE + DATE */}
          <p className="text-xs text-muted-foreground mt-1">
            {source.source || "Unknown source"} • {formattedDate}
          </p>
        </div>
      </div>

      {/* RIGHT BUTTON */}
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-medium hover:opacity-90 flex-shrink-0"
        >
          Open Article
        </a>
      )}
    </div>
  );
}