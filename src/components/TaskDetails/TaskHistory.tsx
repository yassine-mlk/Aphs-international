import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { History, FileText, Calendar, FileUp, Eye } from 'lucide-react';
import { VISA_OPINION_LABELS, VisaOpinion } from '@/types/visaWorkflow';

interface TaskHistoryProps {
  task: any;
  workflow: any;
  visibleSubmissions: any[];
  isSequential: boolean;
  selectedSubmissionId: string | null;
  setSelectedSubmissionId: (id: string | null) => void;
  isAdmin: boolean;
  isExecutor: boolean;
  isValidator: boolean;
  user: any;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({
  task,
  workflow,
  visibleSubmissions,
  isSequential,
  selectedSubmissionId,
  setSelectedSubmissionId,
  isAdmin,
  isExecutor,
  isValidator,
  user
}) => {
  return (
    <Card className={isSequential ? "border-blue-100 shadow-md" : ""}>
      <CardHeader className={isSequential ? "bg-blue-50/30" : ""}>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-600" />
          Révisions et Avis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-12">
          {visibleSubmissions.length > 0 ? (
            visibleSubmissions.map((sub) => (
              <div 
                key={sub.id} 
                className={`space-y-6 ${
                  selectedSubmissionId === sub.id ? 'bg-blue-50/20 p-6 rounded-xl border-2 border-blue-200' : ''
                }`}
              >
                {/* Header de révision agrandi */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm ${
                      isSequential ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isSequential ? (sub.version_label || 'A') : <FileText className="h-7 w-7" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-gray-900">{sub.executor_name}</p>
                        {sub.version_label === workflow?.current_version_label && isSequential && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px] uppercase font-black">Dernière</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <p className="text-xs text-gray-500">Soumis le {new Date(sub.submitted_at).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {isSequential && sub.visa_status && (
                      <Badge className={`px-3 py-1 text-xs font-bold shadow-sm ${
                        sub.visa_status === 'vso' ? 'bg-green-100 text-green-800 border-green-200' :
                        sub.visa_status === 'vao' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {sub.visa_status === 'vso' ? 'Visa Sans Observations' :
                         sub.visa_status === 'vao' ? 'Visa Avec Observations' :
                         'Visa À Resoumettre'}
                      </Badge>
                    )}
                    {!isSequential && sub.reviews?.length > 0 && (
                      (() => {
                        const userHasVoted = sub.reviews?.some((r: any) => r.validator_id === user?.id);
                        const shouldShowBadge = isAdmin || isExecutor || (isValidator && userHasVoted);

                        if (!shouldShowBadge) return null;

                        return (
                          <Badge className={sub.reviews.length >= (task.validators?.length || 0)
                            ? (sub.reviews.every((r: any) => r.opinion === 'F') ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200")
                            : "bg-amber-100 text-amber-700 border-amber-200"
                          }>
                            {sub.reviews.length >= (task.validators?.length || 0)
                              ? (sub.reviews.every((r: any) => r.opinion === 'F') ? "Validé" : "À corriger")
                              : "En cours de revue"}
                          </Badge>
                        );
                      })()
                    )}
                    {isValidator && !isSequential && task.status === 'in_review' && !sub.reviews?.some((r: any) => r.validator_id === user?.id) && (
                      <Button 
                        variant={selectedSubmissionId === sub.id ? "default" : "outline"} 
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setSelectedSubmissionId(sub.id === selectedSubmissionId ? null : sub.id);
                          if (sub.id !== selectedSubmissionId) {
                            document.getElementById('validation-form')?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        {selectedSubmissionId === sub.id ? 'Sélectionné' : 'Statuer'}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Fichier et Commentaire */}
                <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Document de révision</p>
                        <a 
                          href={sub.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          {sub.file_name || 'Consulter le document'}
                          <Eye className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={sub.file_url} target="_blank" rel="noopener noreferrer">
                        Ouvrir
                      </a>
                    </Button>
                  </div>
                  {sub.comment && (
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Note de l'exécuteur</p>
                      <p className="text-sm text-gray-600 italic">"{sub.comment}"</p>
                    </div>
                  )}
                </div>

                {/* Avis des validateurs (Workflow Style) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Avis du circuit</span>
                    <Separator className="flex-1" />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {(() => {
                      const filteredReviews = sub.reviews?.filter((review: any) => {
                        if (task.assignment_type === 'standard') {
                          if (isAdmin || task.transparency_mode) return true;
                          if (isExecutor) return sub.executor_id === user?.id;
                          if (isValidator) {
                            // Un validateur ne voit les avis des autres que s'il a déjà statué
                            const userHasVoted = sub.reviews?.some((r: any) => r.validator_id === user?.id);
                            if (userHasVoted) return true;
                            return review.validator_id === user?.id;
                          }
                        }
                        return true;
                      }) || [];

                      return filteredReviews.length > 0 ? (
                        filteredReviews.map((review: any) => {
                          const opinion = review.opinion as VisaOpinion;
                          const opinionLabel = VISA_OPINION_LABELS[opinion];
                          
                          // Couleurs personnalisées selon l'avis
                          const colors: Record<VisaOpinion, { bg: string, text: string, border: string }> = {
                            'F': { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', border: 'border-[#C8E6C9]' },
                            'D': { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', border: 'border-[#FFCDD2]' },
                            'S': { bg: 'bg-[#FFF3E0]', text: 'text-[#E65100]', border: 'border-[#FFE0B2]' },
                            'HM': { bg: 'bg-[#F5F5F5]', text: 'text-[#616161]', border: 'border-[#E0E0E0]' }
                          };
                          
                          const color = colors[opinion] || colors['HM'];

                          return (
                            <div 
                              key={review.id} 
                              className={`flex items-stretch rounded-xl border ${color.bg} ${color.border} overflow-hidden shadow-sm`}
                            >
                              <div className={`w-16 flex items-center justify-center text-2xl font-black ${color.text} border-r ${color.border} bg-white/30`}>
                                {opinion}
                              </div>
                              <div className="flex-1 p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <div>
                                    <p className={`text-sm font-black ${color.text}`}>
                                      {opinionLabel?.label || opinion}
                                    </p>
                                    <p className="text-xs font-bold text-gray-700">
                                      {review.validator_name}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-gray-500 font-medium">
                                    Rendu le {new Date(review.reviewed_at).toLocaleString('fr-FR')}
                                  </p>
                                </div>
                                {review.comment && (
                                  <p className="mt-2 text-sm text-gray-700 italic leading-relaxed">
                                    "{review.comment}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-sm text-gray-400 italic">Aucun avis visible pour vous sur cette révision.</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Séparateur entre les révisions */}
                <div className="py-4">
                  <Separator className="bg-gray-100" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">Aucune soumission pour le moment.</p>
              <p className="text-xs text-gray-400 mt-1">Les fichiers soumis apparaîtront ici avec les avis des validateurs.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
