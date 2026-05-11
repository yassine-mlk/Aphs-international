import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Clock, FileCheck, User } from 'lucide-react';
import { useAdvancedKPIs } from '@/hooks/useAdvancedKPIs';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

interface ValidationRateChartProps {
  tenantId: string | undefined;
}

const PIE_COLORS = ['#22c55e', '#ef4444'];

export const ValidationRateChart: React.FC<ValidationRateChartProps> = ({ tenantId }) => {
  const { validationMetrics, loading, fetchValidationMetrics } = useAdvancedKPIs(tenantId);

  useEffect(() => {
    fetchValidationMetrics();
  }, [fetchValidationMetrics]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-gray-50 pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!validationMetrics || validationMetrics.totalSubmissions === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
        <CardHeader className="border-b border-gray-50 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <FileCheck className="h-5 w-5 text-green-600" />
            </div>
            Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center text-gray-400">
          <FileCheck className="h-10 w-10 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">Aucune validation effectuée</p>
          <p className="text-xs text-gray-300 mt-1">Les stats apparaîtront après les premières validations</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: 'Validé 1er coup', value: Math.round(validationMetrics.firstTimeApprovalRate * validationMetrics.totalSubmissions / 100) },
    { name: 'Révision nécessaire', value: validationMetrics.totalSubmissions - Math.round(validationMetrics.firstTimeApprovalRate * validationMetrics.totalSubmissions / 100) },
  ];

  return (
    <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardHeader className="border-b border-gray-50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <FileCheck className="h-5 w-5 text-green-600" />
            </div>
            Validation
          </CardTitle>
          <Badge className="bg-green-500 text-white font-bold text-xs">
            {validationMetrics.firstTimeApprovalRate}% 1er coup
          </Badge>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Taux de validation du 1er passage et temps de revue
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-green-700">{validationMetrics.firstTimeApprovalRate}%</p>
            <p className="text-[10px] text-green-600 font-medium">Validé 1er coup</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-blue-700">{validationMetrics.avgReviewTimeHours}h</p>
            <p className="text-[10px] text-blue-600 font-medium">Temps moyen de revue</p>
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
              >
                {pieData.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend
                verticalAlign="bottom"
                height={30}
                iconType="circle"
                formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {validationMetrics.topValidators.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Top validateurs</p>
            <div className="space-y-2">
              {validationMetrics.topValidators.map((v) => (
                <div key={v.userId} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-3 w-3 text-gray-500" />
                  </div>
                  <span className="font-medium text-gray-700 flex-1 truncate">
                    {v.firstName} {v.lastName}
                  </span>
                  <span className="text-gray-500">{v.reviewCount} avis</span>
                  <span className="text-gray-400">Ø {v.avgTimeHours}h</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
