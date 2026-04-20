import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, XCircle, BarChart3 } from 'lucide-react';

export default function StatsOverview({ history }) {
  const trueCount = history.filter(h => h.verdict === 'true').length;
  const partialCount = history.filter(h => h.verdict === 'partial').length;
  const fakeCount = history.filter(h => h.verdict === 'not_reliable').length;
  const total = history.length;

  const stats = [
    { icon: BarChart3, label: 'Total Verified', value: total, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: CheckCircle2, label: 'True', value: trueCount, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: AlertTriangle, label: 'Partial', value: partialCount, color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: XCircle, label: 'Not Reliable', value: fakeCount, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-0 shadow-md shadow-black/5">
          <CardContent className="p-5">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}