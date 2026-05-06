import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText, FileUp, Calendar, ListChecks, User, Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TaskInfoCardProps {
  task: any;
  infoSheet: string | null;
  canViewInfoSheets: boolean;
  isSequential: boolean;
  activeIntervener: any;
  dynamicDeadline: Date | null;
  isDeadlineNear: boolean | null;
  isDeadlinePassed: boolean | null;
}

export const TaskInfoCard: React.FC<TaskInfoCardProps> = ({
  task,
  infoSheet,
  canViewInfoSheets,
  isSequential,
  activeIntervener,
  dynamicDeadline,
  isDeadlineNear,
  isDeadlinePassed
}) => {
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  return (
    <>
      {/* Fiche Informative (si disponible et autorisé) */}
      {canViewInfoSheets && infoSheet && (
        <Card className="border-blue-100 bg-blue-50/10 overflow-hidden transition-all duration-300">
          <button 
            onClick={() => setShowInfoSheet(!showInfoSheet)}
            className="w-full flex items-center justify-between p-4 hover:bg-blue-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-blue-900">Fiche Informative</h3>
                <p className="text-xs text-blue-600/70">Consignes et objectifs détaillés pour cette tâche</p>
              </div>
            </div>
            {showInfoSheet ? (
              <ChevronUp className="h-5 w-5 text-blue-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-blue-400" />
            )}
          </button>
          
          {showInfoSheet && (
            <CardContent className="pt-0 pb-6 px-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="prose prose-sm max-w-none text-slate-700 bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {infoSheet}
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Informations principales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.comment && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{task.comment}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1">
              <Label className="text-gray-500">Projet</Label>
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{task.project_name}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-gray-500">
                {task.assignment_type === 'standard' ? 'Fin prévue pour la remise' : 'Échéance globale du circuit'}
              </Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{new Date(task.deadline).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-500">Type de tâche</Label>
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-gray-400" />
                <span className="font-medium">
                  {task.assignment_type === 'workflow' ? 'Revue documentaire séquentielle' : 'Collecte Parallèle'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-500">Extension attendue</Label>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="font-medium uppercase">{task.file_extension}</span>
              </div>
            </div>

            {/* Nouveaux champs pour les tâches séquentielles */}
            {isSequential && activeIntervener && (
              <>
                <div className="space-y-1 sm:col-span-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <Label className="text-blue-700 font-semibold">Intervenant actif</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-blue-900">
                      {activeIntervener.label} — {activeIntervener.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2 p-3 bg-amber-50/30 rounded-lg border border-amber-100">
                  <Label className="text-amber-700 font-semibold">Date de remise dynamique</Label>
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${isDeadlinePassed ? 'text-red-500' : isDeadlineNear ? 'text-orange-500' : 'text-amber-500'}`} />
                    <span className={`font-bold ${
                      isDeadlinePassed ? 'text-red-600' : 
                      isDeadlineNear ? 'text-orange-600' : 
                      'text-amber-700'
                    }`}>
                      Date de remise : {dynamicDeadline ? dynamicDeadline.toLocaleDateString('fr-FR') : 'Non définie'}
                      {isDeadlinePassed && " (Retard)"}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1 italic">
                    Basé sur la répartition équitable du délai global entre tous les intervenants.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
