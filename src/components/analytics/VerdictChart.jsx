import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function VerdictChart({ history }) {
  const trueCount = history.filter(h => h.verdict === 'true').length;
  const partialCount = history.filter(h => h.verdict === 'partial').length;
  const fakeCount = history.filter(h => h.verdict === 'not_reliable').length;

  const pieData = [
    { name: 'True', value: trueCount, color: '#10b981' },
    { name: 'Partial', value: partialCount, color: '#f59e0b' },
    { name: 'Not Reliable', value: fakeCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'True', count: trueCount, fill: '#10b981' },
    { name: 'Partial', count: partialCount, fill: '#f59e0b' },
    { name: 'Not Reliable', count: fakeCount, fill: '#ef4444' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-0 shadow-md shadow-black/5">
        <CardContent className="p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Verdict Distribution</h3>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No data yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md shadow-black/5">
        <CardContent className="p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">True vs Fake</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}