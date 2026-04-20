import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function TrendChart({ history }) {
  const sorted = [...history].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  
  const data = sorted.map((h) => ({
    date: format(new Date(h.created_date), 'MMM d'),
    confidence: h.confidence_score || 0,
  }));

  return (
    <Card className="border-0 shadow-md shadow-black/5">
      <CardContent className="p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Confidence Trend</h3>
        <div className="h-64">
          {data.length > 0 ? (
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No data yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}