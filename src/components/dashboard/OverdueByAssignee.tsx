import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ChevronRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdvancedKPIs, type OverdueByAssignee } from '@/hooks/useAdvancedKPIs';

interface OverdueByAssigneeProps {
  tenantId: string | undefined;
}

export const OverdueByAssigneeCard: React.FC<OverdueByAssigneeProps> = ({ tenantId }) => {
  const navigate = useNavigate();
  const { overdueByAssignee, loading, fetchOverdueByAssignee } = useAdvancedKPIs(tenantId);

  useEffect(() => {
    fetchOverdueByAssignee();
  }, [fetchOverdueByAssignee]);

  const totalOverdue = overdueByAssignee.reduce((sum, a) => sum + a.overdueCount, 0);
  const totalCritical = overdueByAssignee.reduce((sum, a) => sum + a.criticalCount, 0);

  const getSeverityColor = (avgDelay: number) => {
    if (avgDelay > 15) return 'text-red-600 bg-red-50 border-red-100';
    if (avgDelay > 7) return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-yellow-600 bg-yellow-50 border-yellow-100';
  };

  const getSeverityLabel = (avgDelay: number) => {
    if (avgDelay > 15) return 'Critique';
    if (avgDelay > 7) return 'Urgent';
    return 'Modéré';
  };

  return (
    <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardHeader className="border-b border-gray-50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-[#D32F2F]" />
            </div>
            Tâches en retard par intervenant
          </CardTitle>
          {totalOverdue > 0 && (
            <Badge className="bg-[#D32F2F] text-white font-bold text-xs px-3 py-1">
              {totalOverdue} tâche{totalOverdue > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {totalCritical > 0 && (
          <p className="text-xs text-red-600 font-medium mt-2">
            ⚠️ {totalCritical} tâche{totalCritical > 1 ? 's' : ''} critique{totalCritical > 1 ? 's' : ''} (&gt;15 jours de retard)
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : overdueByAssignee.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Clock className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">Aucune tâche en retard</p>
            <p className="text-xs text-gray-300 mt-1">Toutes les tâches sont dans les temps</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {overdueByAssignee.map((item) => (
              <div
                key={item.userId}
                className="flex items-center p-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                onClick={() => navigate(`/dashboard/intervenants`)}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <User className="h-5 w-5 text-[#D32F2F]" />
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {item.firstName} {item.lastName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="bg-red-50 text-[#D32F2F] border-red-100 font-bold text-[10px]"
                    >
                      {item.overdueCount} tâche{item.overdueCount > 1 ? 's' : ''}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`font-bold text-[10px] ${getSeverityColor(item.avgDelayDays)}`}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      +{item.avgDelayDays}j
                    </Badge>
                    {item.criticalCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-700 border-red-200 font-bold text-[10px]"
                      >
                        🔴 {item.criticalCount}
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors ml-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
