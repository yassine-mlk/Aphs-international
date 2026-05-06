import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Clock, FileText } from 'lucide-react';
import { VisaOpinion } from '@/types/visaWorkflow';

interface TaskFullHistoryProps {
  task: any;
  workflow: any;
  visibleHistory: any[];
  isSequential: boolean;
  participantNames: Record<string, string>;
  getHistoryActionLabel: (action: string, details: any) => string;
  getHistoryIcon: (action: string) => React.ReactNode;
}

export const TaskFullHistory: React.FC<TaskFullHistoryProps> = ({
  task,
  workflow,
  visibleHistory,
  isSequential,
  participantNames,
  getHistoryActionLabel,
  getHistoryIcon
}) => {
  return (
    <Card className={isSequential ? "border-blue-100 shadow-md" : ""}>
      <CardHeader className={isSequential ? "bg-blue-50/30" : ""}>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-600" />
          {isSequential ? "Historique du workflow" : "Historique de la tâche"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="relative pl-10 space-y-8 before:content-[''] before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
          {visibleHistory.length > 0 ? (
            visibleHistory.map((item, idx) => {
              const actionLabel = getHistoryActionLabel(item.action, item.details);
              const userName = workflow?.all_names?.[item.user_id] || participantNames[item.user_id] || 'Système';
              const opinion = item.details?.opinion as VisaOpinion;
              
              // Style spécifique selon l'action
              let itemBg = 'bg-gray-50';
              let iconColor = 'text-gray-500';
              let iconBg = 'bg-gray-100';

              if (item.action === 'submission') {
                itemBg = 'bg-blue-50/50';
                iconColor = 'text-blue-600';
                iconBg = 'bg-blue-100';
              } else if (item.action === 'validation' && opinion) {
                const colors: Record<VisaOpinion, { bg: string, text: string }> = {
                  'F': { bg: 'bg-green-50', text: 'text-green-600' },
                  'D': { bg: 'bg-red-50', text: 'text-red-600' },
                  'S': { bg: 'bg-orange-50', text: 'text-orange-600' },
                  'HM': { bg: 'bg-gray-50', text: 'text-gray-600' }
                };
                itemBg = colors[opinion]?.bg || 'bg-gray-50';
                iconColor = colors[opinion]?.text || 'text-gray-600';
                iconBg = colors[opinion]?.bg || 'bg-gray-100';
              } else if (item.action === 'admin_decision') {
                const decision = item.details?.decision;
                if (decision === 'approved' || decision === 'closed') {
                  itemBg = 'bg-green-50/50';
                  iconColor = 'text-green-600';
                  iconBg = 'bg-green-100';
                } else if (decision?.startsWith('relaunch')) {
                  itemBg = 'bg-purple-50/50';
                  iconColor = 'text-purple-600';
                  iconBg = 'bg-purple-100';
                }
              } else if (item.new_status === 'blocked') {
                itemBg = 'bg-red-50/50';
                iconColor = 'text-red-600';
                iconBg = 'bg-red-100';
              }

              return (
                <div key={item.id || idx} className={`relative p-4 rounded-xl border border-transparent transition-all hover:border-gray-200 ${itemBg}`}>
                  <div className={`absolute -left-[35px] mt-0.5 w-10 h-10 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center z-10 ${iconBg} ${iconColor}`}>
                    {React.cloneElement(getHistoryIcon(item.action) as React.ReactElement, { className: 'h-5 w-5' })}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-black text-sm uppercase tracking-wide">
                        {item.action === 'admin_decision' && (item.details?.decision === 'approved' || item.details?.decision === 'closed')
                          ? `Clôture par ${userName}`
                          : `${actionLabel} par ${userName}`
                        }
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500">
                          {new Date(item.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    {item.new_status && item.old_status !== item.new_status && (
                      <Badge variant="outline" className="text-[10px] font-black bg-white/50 border-gray-200 h-6">
                        {item.old_status?.toUpperCase() || 'OPEN'} → {item.new_status.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {item.details?.comment && (
                    <div className="mt-3 pl-3 border-l-2 border-gray-200/50">
                      <p className="text-sm text-gray-700 italic leading-relaxed">
                        "{item.details.comment}"
                      </p>
                    </div>
                  )}
                  
                  {item.action === 'submission' && item.details?.file_name && (
                    <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-blue-600">
                      <FileText className="h-3 w-3" />
                      {item.details.file_name}
                      {item.details.version && <Badge className="h-4 text-[8px] px-1 bg-blue-600">Indice {item.details.version_label || '?'}</Badge>}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 italic">Aucun historique disponible pour ce workflow.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
