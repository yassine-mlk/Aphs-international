import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import { useAdvancedKPIs } from '@/hooks/useAdvancedKPIs';

interface VelocityChartProps {
  tenantId: string | undefined;
}

export const VelocityChart: React.FC<VelocityChartProps> = ({ tenantId }) => {
  const { velocityData, loading, fetchVelocity } = useAdvancedKPIs(tenantId);

  useEffect(() => {
    fetchVelocity();
  }, [fetchVelocity]);

  const trendIcon = velocityData?.trend === 'up' ? TrendingUp : velocityData?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = velocityData?.trend === 'up' ? 'text-green-600' : velocityData?.trend === 'down' ? 'text-red-600' : 'text-gray-500';
  const trendPrefix = velocityData?.trend === 'up' ? '+' : velocityData?.trend === 'down' ? '' : '';

  return (
    <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardHeader className="border-b border-gray-50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            Vélocité
          </CardTitle>
          {velocityData && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500 font-medium">
                Ø {velocityData.avgWeekly}/sem
              </span>
              <span className={`font-bold flex items-center gap-1 ${trendColor}`}>
                {React.createElement(trendIcon, { className: 'h-4 w-4' })}
                {trendPrefix}{velocityData.trendValue}%
              </span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Tâches complétées par semaine — barres = réalisé, ligne = moyenne mobile (4 sem.)
        </p>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !velocityData || velocityData.weeks.every(w => w.completed === 0) ? (
          <div className="h-48 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">Aucune tâche complétée</p>
              <p className="text-xs text-gray-300 mt-1">Les 12 dernières semaines</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={velocityData.weeks} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="rect"
                  formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>}
                />
                <Bar
                  dataKey="completed"
                  name="Tâches complétées"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  name="Moyenne mobile (4 sem.)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
