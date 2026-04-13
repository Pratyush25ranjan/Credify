import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const verdictConfig = {
  true: {
    label: 'Verified True',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    iconColor: 'text-emerald-500',
  },
  partial: {
    label: 'Partially Verified',
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconColor: 'text-amber-500',
  },
  not_reliable: {
    label: 'Not Reliable',
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconColor: 'text-red-500',
  },
};

export default function VerdictBadge({ verdict, large = false }) {
  const config = verdictConfig[verdict] || verdictConfig.not_reliable;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-semibold",
        config.bg, config.border, config.text,
        large ? "px-6 py-3 text-lg" : "px-4 py-1.5 text-sm"
      )}
    >
      <Icon className={cn(config.iconColor, large ? "w-6 h-6" : "w-4 h-4")} />
      {config.label}
    </div>
  );
}