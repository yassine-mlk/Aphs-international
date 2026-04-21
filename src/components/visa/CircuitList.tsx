import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, Clock, User, ArrowRight } from "lucide-react";
import { VisaCircuit, VisaCircuitStep } from "@/types/visa";
import { CircuitBuilder } from "./CircuitBuilder";

interface CircuitListProps {
  circuits: VisaCircuit[];
  intervenants: Array<{ id: string; first_name: string; last_name: string; role: string; email?: string }>;
  onCreate: (name: string, documentType: string, steps: VisaCircuitStep[], userId: string) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  currentUserId?: string;
}

const ROLE_LABELS: Record<string, string> = {
  architecte: 'Architecte',
  controleur_technique: 'Contrôleur Technique',
  be_structure: 'BE Structure',
  be_mep: 'BE MEP',
  maitre_oeuvre: 'Maître d\'Œuvre',
  maitre_ouvrage: 'Maître d\'Ouvrage',
};

const TYPE_LABELS: Record<string, string> = {
  plan: 'Plan',
  note: 'Note',
  rapport: 'Rapport',
  fiche: 'Fiche technique',
  devis: 'Devis',
};

export const CircuitList: React.FC<CircuitListProps> = ({ 
  circuits, 
  intervenants, 
  onCreate, 
  onDelete,
  loading,
  currentUserId 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [expandedCircuit, setExpandedCircuit] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedCircuit(expandedCircuit === id ? null : id);
  };

  const handleCreate = (name: string, documentType: string, steps: VisaCircuitStep[]) => {
    if (!currentUserId) return;
    onCreate(name, documentType, steps, currentUserId);
    setIsCreating(false);
  };

  return (
    <div className="space-y-4">
      {/* Header avec bouton créer */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Circuits de validation ({circuits.length})</h3>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau circuit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Nouveau circuit de validation</DialogTitle>
              <DialogDescription>
                Créez un circuit en définissant l'ordre des validateurs
              </DialogDescription>
            </DialogHeader>
            <CircuitBuilder 
              intervenants={intervenants}
              onSave={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des circuits */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      ) : circuits.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
          Aucun circuit. Créez le premier avec le bouton ci-dessus.
        </div>
      ) : (
        <div className="space-y-3">
          {circuits.map((circuit) => (
            <Card key={circuit.id} className={expandedCircuit === circuit.id ? 'ring-1 ring-teal-500' : ''}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{circuit.name}</CardTitle>
                      <Badge variant="outline">{TYPE_LABELS[circuit.document_type] || circuit.document_type}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {circuit.steps.length} étape(s) • Créé le {new Date(circuit.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleExpand(circuit.id)}
                    >
                      {expandedCircuit === circuit.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setDeleteTarget(circuit.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedCircuit === circuit.id && (
                <CardContent className="pt-0">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* Header du circuit */}
                    <div className="flex justify-between items-start border-b pb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">Détail du circuit de validation</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Créé le {new Date(circuit.created_at).toLocaleDateString('fr-FR')} par {(circuit as any).created_by_name || 'Admin'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {circuit.steps.length} étape{circuit.steps.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    {/* Tableau des étapes */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 border-b">
                            <th className="px-3 py-2 text-left font-medium text-gray-700 w-16">Ordre</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Rôle / Fonction</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Intervenant assigné</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-700 w-28">Délai</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-700 w-24">Statut</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-700 w-32">Échéance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(circuit.steps as VisaCircuitStep[]).map((step, index) => {
                            const intervenant = intervenants.find(u => u.id === step.user_id);
                            const isFirst = index === 0;
                            const isLast = index === circuit.steps.length - 1;
                            
                            return (
                              <tr key={index} className="hover:bg-white transition-colors">
                                <td className="px-3 py-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-semibold text-sm">
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="font-medium text-gray-900">
                                    {ROLE_LABELS[step.role] || step.role}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {isFirst ? 'Début du circuit' : isLast ? 'Validation finale' : `Étape ${index + 1}`}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  {intervenant ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium">
                                        {intervenant.first_name?.[0]}{intervenant.last_name?.[0]}
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900">
                                          {intervenant.first_name} {intervenant.last_name}
                                        </div>
                                        <div className="text-xs text-gray-500">{intervenant.email || '-'}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic">Non assigné</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-gray-700">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-medium">{step.deadline_days}j</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                                    Configuré
                                  </Badge>
                                </td>
                                <td className="px-3 py-3 text-center text-gray-500">
                                  <span className="text-xs">-</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Timeline visuelle */}
                    <div className="pt-2 border-t">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Flux de validation</h5>
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {(circuit.steps as VisaCircuitStep[]).map((step, index) => {
                          const intervenant = intervenants.find(u => u.id === step.user_id);
                          const isLast = index === circuit.steps.length - 1;
                          
                          return (
                            <React.Fragment key={index}>
                              <div className="flex flex-col items-center min-w-[100px]">
                                <div className="w-10 h-10 rounded-full bg-teal-100 border-2 border-teal-300 flex items-center justify-center text-teal-700 font-semibold text-sm">
                                  {index + 1}
                                </div>
                                <div className="mt-2 text-center">
                                  <div className="text-xs font-medium text-gray-900 truncate max-w-[100px]">
                                    {intervenant?.first_name || '?'}
                                  </div>
                                  <div className="text-[10px] text-gray-500 uppercase truncate max-w-[100px]">
                                    {ROLE_LABELS[step.role] || step.role}
                                  </div>
                                </div>
                              </div>
                              {!isLast && (
                                <div className="flex items-center text-gray-300">
                                  <ArrowRight className="h-4 w-4" />
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Infos résumé */}
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t text-sm">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-gray-500 text-xs">Durée totale estimée</div>
                        <div className="font-semibold text-gray-900">
                          {(circuit.steps as VisaCircuitStep[]).reduce((sum, s) => sum + (s.deadline_days || 0), 0)} jours
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-gray-500 text-xs">Intervenants uniques</div>
                        <div className="font-semibold text-gray-900">
                          {new Set((circuit.steps as VisaCircuitStep[]).map(s => s.user_id).filter(Boolean)).size} personnes
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-gray-500 text-xs">Documents en validation</div>
                        <div className="font-semibold text-gray-900">
                          {(circuit as any).active_instances_count || 0} en cours
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Dialog confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le circuit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les validations en cours avec ce circuit ne seront pas affectées, 
              mais vous ne pourrez plus l'utiliser pour de nouvelles tâches.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
