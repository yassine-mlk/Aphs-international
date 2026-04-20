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
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, Clock, User } from "lucide-react";
import { VisaCircuit, VisaCircuitStep } from "@/types/visa";
import { CircuitBuilder } from "./CircuitBuilder";

interface CircuitListProps {
  circuits: VisaCircuit[];
  intervenants: Array<{ id: string; first_name: string; last_name: string; role: string }>;
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
                  <div className="border rounded-lg divide-y">
                    {(circuit.steps as VisaCircuitStep[]).map((step, index) => (
                      <div key={index} className="flex items-center gap-3 p-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{ROLE_LABELS[step.role] || step.role}</div>
                          <div className="text-sm text-gray-500">
                            {intervenants.find(u => u.id === step.user_id)?.first_name} {intervenants.find(u => u.id === step.user_id)?.last_name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          {step.deadline_days} jours
                        </div>
                      </div>
                    ))}
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
