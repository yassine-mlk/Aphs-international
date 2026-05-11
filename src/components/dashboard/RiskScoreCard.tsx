import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ChevronRight, ShieldAlert, TrendingUp, Clock, Ban } from 'lucide-react';
import { useAdvancedKPIs, type RiskScoreProject } from '@/hooks/useAdvancedKPIs';

interface RiskScoreCardProps {
  tenantId: string | undefined;
}

const categoryColors = {
  ok: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-500', label: 'OK' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-500', label: 'Surveillance' },
  danger: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-500', label: 'Critique' },
};

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ tenantId }) => {
  const navigate = useNavigate();
  const { riskScores, loading, fetchRiskScores } = useAdvancedKPIs(tenantId);

  useEffect(() => {
    fetchRiskScores();
  }, [fetchRiskScores]);

  const dangerCount = riskScores.filter(r => r.category === 'danger').length;
  const warningCount = riskScores.filter(r => r.category === 'warning').length;

  const getScoreBarColor = (score: number) => {
    if (score > 60) return 'bg-red-500';
    if (score > 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getFactorIcon = (factor: string) => {
    switch (factor) {
      case 'burnRate': return TrendingUp;
      case 'overduePct': return Clock;
      case 'blockedCount': return Ban;
      case 'deadlineUrgency': return AlertTriangle;
      default: return ShieldAlert;
    }
  };

  const getFactorLabel = (factor: string, value: any) => {
    switch (factor) {
      case 'burnRate': return `Burn rate ${value}x`;
      case 'overduePct': return `${value}% tâches en retard`;
      case 'blockedCount': return `${value} workflow(s) bloqué(s)`;
      case 'deadlineUrgency': return 'Deadline imminente';
      default: return '';
    }
  };

  return (
    <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardHeader className="border-b border-gray-50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
            Projets à risque
          </CardTitle>
          <div className="flex items-center gap-2">
            {dangerCount > 0 && (
              <Badge className="bg-red-500 text-white font-bold text-xs">{dangerCount} critique{dangerCount > 1 ? 's' : ''}</Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-yellow-500 text-white font-bold text-xs">{warningCount} à surveiller</Badge>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Score de risque combiné (burn rate, retards, workflows bloqués, deadline)
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
        ) : riskScores.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ShieldAlert className="h-10 w-10 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">Aucun projet actif</p>
            <p className="text-xs text-gray-300 mt-1">Les projets apparaîtront ici une fois créés</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {riskScores.map((project) => {
              const cfg = categoryColors[project.category];
              const activeFactors = Object.entries(project.factors).filter(([_, v]) => {
                if (typeof v === 'number') return v > 0;
                return v === true;
              });

              return (
                <div
                  key={project.projectId}
                  className="p-4 hover:bg-gray-50 transition-colors group cursor-pointer relative"
                  onClick={() => navigate(`/dashboard/projets/${project.projectId}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{project.projectName}</p>
                      <Badge className={`${cfg.badge} text-white font-bold text-[10px]`}>{cfg.label}</Badge>
                    </div>
                    <span className={`text-lg font-black ${cfg.text} ml-3`}>{project.score}</span>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getScoreBarColor(project.score)}`}
                      style={{ width: `${project.score}%` }}
                    />
                  </div>

                  {activeFactors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeFactors.map(([key, value]) => {
                        const Icon = getFactorIcon(key);
                        return (
                          <Badge
                            key={key}
                            variant="secondary"
                            className="bg-gray-50 text-gray-600 border-gray-200 font-medium text-[10px] flex items-center gap-1"
                          >
                            <Icon className="h-3 w-3" />
                            {getFactorLabel(key, value)}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
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
