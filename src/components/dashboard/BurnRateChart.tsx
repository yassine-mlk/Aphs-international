import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ChevronRight, AlertTriangle, CheckCircle, Minus } from 'lucide-react';
import { useAdvancedKPIs, type BurnRate } from '@/hooks/useAdvancedKPIs';

interface BurnRateChartProps {
  tenantId: string | undefined;
}

const categoryConfig = {
  ok: { label: 'OK', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: 'bg-green-500', icon: CheckCircle },
  warning: { label: 'En retard', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', bar: 'bg-yellow-500', icon: Minus },
  danger: { label: 'Critique', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500', icon: AlertTriangle },
  no_data: { label: 'Pas de données', bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', bar: 'bg-gray-300', icon: Minus },
};

export const BurnRateChart: React.FC<BurnRateChartProps> = ({ tenantId }) => {
  const navigate = useNavigate();
  const { burnRates, loading, fetchBurnRates } = useAdvancedKPIs(tenantId);

  useEffect(() => {
    fetchBurnRates();
  }, [fetchBurnRates]);

  const dangerCount = burnRates.filter(b => b.category === 'danger').length;
  const warningCount = burnRates.filter(b => b.category === 'warning').length;

  const getBurnRateBar = (br: BurnRate) => {
    const maxBarWidth = 100;
    const barWidth = br.burnRate !== null
      ? Math.min(maxBarWidth, Math.round(br.burnRate * 50))
      : 0;
    const cfg = categoryConfig[br.category];
    return { barWidth, cfg };
  };

  return (
    <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardHeader className="border-b border-gray-50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            Burn Rate
          </CardTitle>
          <div className="flex items-center gap-2">
            {dangerCount > 0 && (
              <Badge className="bg-red-500 text-white font-bold text-xs">
                {dangerCount} critique{dangerCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-yellow-500 text-white font-bold text-xs">
                {warningCount} en retard
              </Badge>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Ratio temps écoulé / tâches terminées — plus le chiffre est élevé, plus le projet dérape
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : burnRates.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <TrendingUp className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">Aucun projet actif</p>
            <p className="text-xs text-gray-300 mt-1">Les projets actifs apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {burnRates.map((br) => {
              const { barWidth, cfg } = getBurnRateBar(br);
              const Icon = cfg.icon;
              return (
                <div
                  key={br.projectId}
                  className="p-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/dashboard/projets/${br.projectId}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{br.projectName}</p>
                      <Badge className={`${cfg.bg} ${cfg.text} ${cfg.border} font-bold text-[10px]`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      {br.burnRate !== null ? (
                        <span className={`text-sm font-black ${cfg.text}`}>{br.burnRate}x</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-gray-500 mb-1.5">
                    <span>Temps: {br.elapsedRatio}%</span>
                    <span>Tâches: {br.completionRatio}%</span>
                    <span>{br.completedTasks}/{br.totalTasks} term.</span>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${cfg.bar}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
