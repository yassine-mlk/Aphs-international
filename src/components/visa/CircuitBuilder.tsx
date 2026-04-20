import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2, Clock, User } from "lucide-react";
import { VisaCircuitStep } from "@/types/visa";

interface CircuitBuilderProps {
  intervenants: Array<{ id: string; first_name: string; last_name: string; role: string }>;
  onSave: (name: string, documentType: string, steps: VisaCircuitStep[]) => void;
  onCancel: () => void;
}

const ROLES_OPTIONS = [
  { value: 'architecte', label: 'Architecte' },
  { value: 'controleur_technique', label: 'Contrôleur Technique' },
  { value: 'be_structure', label: 'Bureau d\'Études Structure' },
  { value: 'be_mep', label: 'Bureau d\'Études MEP' },
  { value: 'maitre_oeuvre', label: 'Maître d\'Œuvre' },
  { value: 'maitre_ouvrage', label: 'Maître d\'Ouvrage' },
];

export const CircuitBuilder: React.FC<CircuitBuilderProps> = ({ 
  intervenants, 
  onSave, 
  onCancel 
}) => {
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState('plan');
  const [steps, setSteps] = useState<VisaCircuitStep[]>([]);

  const addStep = () => {
    const newStep: VisaCircuitStep = {
      role: '',
      user_id: '',
      deadline_days: 15,
      order_index: steps.length,
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, field: keyof VisaCircuitStep, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    // Recalculer les order_index
    const reordered = updated.map((step, i) => ({ ...step, order_index: i }));
    setSteps(reordered);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(steps);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    // Recalculer les order_index
    const reorderedSteps = items.map((step, i) => ({ ...step, order_index: i }));
    setSteps(reorderedSteps);
  };

  const handleSave = () => {
    if (!name.trim() || steps.length === 0) return;
    onSave(name.trim(), documentType, steps);
  };

  const isValid = name.trim() && steps.length > 0 && steps.every(s => s.role && s.user_id);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Nouveau circuit de validation</CardTitle>
        <CardDescription>
          Définissez l'ordre des validateurs et leurs délais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Nom et type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom du circuit</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Validation Plans - Archi → CT"
            />
          </div>
          <div className="space-y-2">
            <Label>Type de document</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="rapport">Rapport</SelectItem>
                <SelectItem value="fiche">Fiche technique</SelectItem>
                <SelectItem value="devis">Devis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Liste des étapes draggable */}
        <div className="space-y-2">
          <Label>Ordre des validateurs ({steps.length} étape{steps.length > 1 ? 's' : ''})</Label>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="steps">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {steps.map((step, index) => (
                    <Draggable key={index} draggableId={`step-${index}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 p-3 border rounded-lg ${
                            snapshot.isDragging ? 'bg-gray-50 shadow-lg' : 'bg-white'
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab">
                            <GripVertical className="h-5 w-5 text-gray-400" />
                          </div>
                          
                          <div className="flex-1 grid grid-cols-3 gap-3">
                            {/* Rôle */}
                            <Select 
                              value={step.role} 
                              onValueChange={(v) => updateStep(index, 'role', v)}
                            >
                              <SelectTrigger>
                                <User className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Rôle" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES_OPTIONS.map(role => (
                                  <SelectItem key={role.value} value={role.value}>
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Intervenant */}
                            <Select 
                              value={step.user_id} 
                              onValueChange={(v) => updateStep(index, 'user_id', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                {intervenants.map(user => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Délai */}
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <Input 
                                type="number" 
                                value={step.deadline_days}
                                onChange={(e) => updateStep(index, 'deadline_days', parseInt(e.target.value) || 15)}
                                className="w-20"
                              />
                              <span className="text-sm text-gray-500">jours</span>
                            </div>
                          </div>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeStep(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {steps.length === 0 && (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
              Aucune étape. Cliquez sur "+ Ajouter" pour commencer.
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={addStep}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une étape
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!isValid}>
              Créer le circuit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
