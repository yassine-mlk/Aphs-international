import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileUp, Upload, CheckCircle, ArrowRight, Clock, Calendar, Repeat } from "lucide-react";
import { VisaCircuit } from "@/types/visa";

interface TaskAssignmentEnhancedProps {
  taskName: string;
  intervenants: Array<{ id: string; first_name: string; last_name: string; email: string; specialty?: string }>;
  circuits: VisaCircuit[];
  onSubmit: (data: AssignmentFormData) => void;
  onCancel: () => void;
}

export interface AssignmentFormData {
  // Mode de validation
  taskMode: 'simple' | 'validation' | 'visa';
  
  // Exécuteur et validateurs (mode simple/validation)
  assignedTo: string[];
  validators: string[];
  deadline: string;
  validationDeadline: string;
  fileExtension: string;
  comment: string;
  
  // Mode visa
  visaCircuitId: string | null;
  
  // Mode récurrent
  isRecurring: boolean;
  recurrencePattern: 'weekly' | 'monthly' | null;
  recurrenceDay: number | null;
}

const TASK_MODE_OPTIONS = [
  { 
    value: 'simple', 
    label: 'Upload simple', 
    description: 'L\'intervenant dépose un fichier, pas de validation requise',
    icon: Upload 
  },
  { 
    value: 'validation', 
    label: 'Validation simple', 
    description: 'Upload + validation par un ou plusieurs validateurs',
    icon: CheckCircle 
  },
  { 
    value: 'visa', 
    label: 'Circuit visa complet', 
    description: 'Avis technique F/D/S/HM + Visa VSO/VAO/VAR en cascade',
    icon: ArrowRight 
  },
];

const RECURRENCE_OPTIONS = [
  { value: 'weekly', label: 'Hebdomadaire', description: 'Ex: Rapport de chantier chaque semaine' },
  { value: 'monthly', label: 'Mensuel', description: 'Ex: Bilan mensuel' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
];

export const TaskAssignmentEnhanced: React.FC<TaskAssignmentEnhancedProps> = ({
  taskName,
  intervenants,
  circuits,
  onSubmit,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<AssignmentFormData>({
    taskMode: 'validation',
    assignedTo: [],
    validators: [],
    deadline: '',
    validationDeadline: '',
    fileExtension: 'pdf',
    comment: '',
    visaCircuitId: null,
    isRecurring: false,
    recurrencePattern: null,
    recurrenceDay: null,
  });

  const [selectedCircuit, setSelectedCircuit] = useState<VisaCircuit | null>(null);

  // Mettre à jour le circuit sélectionné
  useEffect(() => {
    if (formData.visaCircuitId) {
      const circuit = circuits.find(c => c.id === formData.visaCircuitId);
      setSelectedCircuit(circuit || null);
    } else {
      setSelectedCircuit(null);
    }
  }, [formData.visaCircuitId, circuits]);

  const updateField = <K extends keyof AssignmentFormData>(
    field: K, 
    value: AssignmentFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'assignedTo' | 'validators', itemId: string) => {
    setFormData(prev => {
      const current = prev[field];
      const exists = current.includes(itemId);
      
      // Si on ajoute à assignedTo, retirer de validators si présent
      if (field === 'assignedTo' && !exists) {
        return {
          ...prev,
          [field]: [...current, itemId],
          validators: prev.validators.filter(id => id !== itemId),
        };
      }
      
      // Toggle normal
      return {
        ...prev,
        [field]: exists ? current.filter(id => id !== itemId) : [...current, itemId],
      };
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.taskMode !== null;
      case 2:
        if (formData.taskMode === 'visa') {
          return formData.visaCircuitId !== null;
        }
        return formData.assignedTo.length > 0 && formData.deadline;
      case 3:
        return !formData.isRecurring || (formData.recurrencePattern && formData.recurrenceDay);
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-teal-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Étape 1: Choix du mode */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Mode de validation pour "{taskName}"</h3>
          
          <RadioGroup 
            value={formData.taskMode} 
            onValueChange={(v) => updateField('taskMode', v as any)}
            className="space-y-3"
          >
            {TASK_MODE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value}>
                  <div 
                    className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.taskMode === option.value ? 'border-teal-500 bg-teal-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => updateField('taskMode', option.value as any)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-gray-500" />
                        <Label htmlFor={option.value} className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          {/* Aperçu circuits visa */}
          {formData.taskMode === 'visa' && circuits.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Circuits disponibles ({circuits.length}) :</p>
              <div className="flex flex-wrap gap-2">
                {circuits.map(c => (
                  <Badge key={c.id} variant="outline">{c.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Étape 2: Configuration selon le mode */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-medium text-lg">
            {formData.taskMode === 'visa' ? 'Sélection du circuit' : 'Assignation et délais'}
          </h3>

          {formData.taskMode === 'visa' ? (
            // Mode Visa: sélection circuit
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Circuit de validation</Label>
                <Select 
                  value={formData.visaCircuitId || ''} 
                  onValueChange={(v) => updateField('visaCircuitId', v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un circuit" />
                  </SelectTrigger>
                  <SelectContent>
                    {circuits.map(circuit => (
                      <SelectItem key={circuit.id} value={circuit.id}>
                        {circuit.name} ({(circuit.steps as any[]).length} étapes)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCircuit && (
                <Card className="bg-gray-50">
                  <CardContent className="p-4 space-y-3">
                    <p className="font-medium">{selectedCircuit.name}</p>
                    <div className="space-y-2">
                      {(selectedCircuit.steps as any[]).map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-medium">
                            {idx + 1}
                          </span>
                          <span className="flex-1">{step.role}</span>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {step.deadline_days} jours
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // Mode Simple/Validation: assignation classique
            <div className="space-y-4">
              {/* Exécuteurs */}
              <div className="space-y-2">
                <Label>Intervenants assignés <span className="text-red-500">*</span></Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {intervenants.map(intervenant => (
                    <div key={intervenant.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`exec-${intervenant.id}`}
                        checked={formData.assignedTo.includes(intervenant.id)}
                        onCheckedChange={() => toggleArrayItem('assignedTo', intervenant.id)}
                      />
                      <label htmlFor={`exec-${intervenant.id}`} className="flex-1 text-sm cursor-pointer">
                        <span className="font-medium">{intervenant.first_name} {intervenant.last_name}</span>
                        <span className="text-gray-500 text-xs ml-2">{intervenant.email}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {formData.assignedTo.length} sélectionné(s)
                </p>
              </div>

              {/* Validateurs (uniquement en mode validation) */}
              {formData.taskMode === 'validation' && (
                <div className="space-y-2">
                  <Label>Validateurs</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {intervenants.map(intervenant => (
                      <div key={intervenant.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`val-${intervenant.id}`}
                          checked={formData.validators.includes(intervenant.id)}
                          onCheckedChange={() => toggleArrayItem('validators', intervenant.id)}
                          disabled={formData.assignedTo.includes(intervenant.id)}
                        />
                        <label 
                          htmlFor={`val-${intervenant.id}`} 
                          className={`flex-1 text-sm cursor-pointer ${
                            formData.assignedTo.includes(intervenant.id) ? 'text-gray-400' : ''
                          }`}
                        >
                          <span className="font-medium">{intervenant.first_name} {intervenant.last_name}</span>
                          {formData.assignedTo.includes(intervenant.id) && (
                            <span className="text-xs italic ml-2">(déjà assigné)</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Délais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Délai exécution
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => updateField('deadline', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validationDeadline">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Délai validation
                  </Label>
                  <Input
                    id="validationDeadline"
                    type="date"
                    value={formData.validationDeadline}
                    onChange={(e) => updateField('validationDeadline', e.target.value)}
                    min={formData.deadline || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Format fichier */}
              <div className="space-y-2">
                <Label>Format de fichier attendu</Label>
                <Select value={formData.fileExtension} onValueChange={(v) => updateField('fileExtension', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="dwg">DWG (AutoCAD)</SelectItem>
                    <SelectItem value="docx">Word (DOCX)</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Commentaire */}
              <div className="space-y-2">
                <Label>Instructions (optionnel)</Label>
                <Input
                  value={formData.comment}
                  onChange={(e) => updateField('comment', e.target.value)}
                  placeholder="Instructions particulières pour cette tâche..."
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Étape 3: Récurrence (optionnel) */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Répétition de la tâche</h3>

          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <Checkbox
              id="recurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => {
                updateField('isRecurring', checked as boolean);
                if (!checked) {
                  updateField('recurrencePattern', null);
                  updateField('recurrenceDay', null);
                }
              }}
            />
            <div className="flex-1">
              <label htmlFor="recurring" className="font-medium cursor-pointer flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Tâche récurrente
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Cette tâche sera exécutée régulièrement (ex: rapport hebdomadaire)
              </p>
            </div>
          </div>

          {formData.isRecurring && (
            <div className="space-y-4 pl-8">
              <div className="space-y-2">
                <Label>Fréquence</Label>
                <RadioGroup 
                  value={formData.recurrencePattern || ''} 
                  onValueChange={(v) => updateField('recurrencePattern', v as any)}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <div 
                        key={opt.value}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          formData.recurrencePattern === opt.value ? 'border-teal-500 bg-teal-50' : ''
                        }`}
                        onClick={() => updateField('recurrencePattern', opt.value as 'weekly' | 'monthly')}
                      >
                        <RadioGroupItem value={opt.value} id={opt.value} className="mr-2" />
                        <Label htmlFor={opt.value} className="cursor-pointer font-medium">{opt.label}</Label>
                        <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {formData.recurrencePattern === 'weekly' && (
                <div className="space-y-2">
                  <Label>Jour de la semaine</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={formData.recurrenceDay === day.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateField('recurrenceDay', day.value)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!formData.isRecurring && (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Tâche ponctuelle</p>
              <p className="text-sm">L'administrateur devra créer manuellement les occurrences suivantes</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={step === 1 ? onCancel : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
        >
          {step === 1 ? 'Annuler' : 'Précédent'}
        </Button>
        
        <Button 
          onClick={step === 3 ? handleSubmit : () => setStep((s) => (s + 1) as 1 | 2 | 3)}
          disabled={!canProceed()}
        >
          {step === 3 ? (
            <>
              <FileUp className="h-4 w-4 mr-2" />
              Assigner la tâche
            </>
          ) : (
            'Suivant'
          )}
        </Button>
      </div>
    </div>
  );
};
