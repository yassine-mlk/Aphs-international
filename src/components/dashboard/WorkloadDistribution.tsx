import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdvancedKPIs } from '@/hooks/useAdvancedKPIs';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface WorkloadDistributionProps {
  tenantId: string | undefined;
}

export const WorkloadDistribution: React.FC<WorkloadDistributionProps> = ({ tenantId }) => {
  const navigate = useNavigate();
  const { workloadData, loading, fetchWorkloadDistribution } = useAdvancedKPIs(tenantId);

  useEffect(() => {
    fetchWorkloadDistribution();
  }, [fetchWorkloadDistribution]);

  const chartData = workloadData.slice(0, 10).map(w => ({
    name: `${w.firstName} ${w.lastName}`.trim() || 'Inconnu',
    actives: w.activeTasks,
    retards: w.overdueTasks,
    score: w.workloadScore,
  }));

  const avgLoad = workloadData.length > 0
    ? Math.round(workloadData.reduce((s, w) => s + w.activeTasks, 0) / workloadData.length * 10) / 10
    : 0;

  return (
    <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardHeader className="border-b border-gray-50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            Charge par intervenant
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-xs">
            Ø {avgLoad} tâches
          </Badge>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Nombre de tâches actives par intervenant — barres vertes = OK, rouges = en retard
        </p>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : workloadData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">Aucune tâche active</p>
              <p className="text-xs text-gray-300 mt-1">Intervenants sans charge de travail</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === 'actives' ? 'Tâches actives' : 'Tâches en retard',
                    ]}
                  />
                  <Bar
                    dataKey="retards"
                    name="retards"
                    stackId="a"
                    fill="#ef4444"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="actives"
                    name="actives"
                    stackId="a"
                    fill="#22c55e"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {workloadData.filter(w => w.overdueTasks > 0).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="text-xs font-bold text-red-600">
                    {workloadData.filter(w => w.overdueTasks > 0).length} intervenant(s) avec des retards
                  </p>
                </div>
                <div className="space-y-1">
                  {workloadData.filter(w => w.overdueTasks > 0).slice(0, 5).map(w => (
                    <div
                      key={w.userId}
                      className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
                      onClick={() => navigate('/dashboard/intervenants')}
                    >
                      <span className="font-medium text-gray-700">
                        {w.firstName} {w.lastName}
                      </span>
                      <Badge className="bg-red-100 text-red-700 border-red-200 font-bold text-[10px]">
                        {w.overdueTasks} retard{w.overdueTasks > 1 ? 's' : ''}
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
