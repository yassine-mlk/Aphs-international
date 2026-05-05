import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SubmitButton } from '@/components/ui/submit-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';

interface Intervenant {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialty?: string;
}

interface AssignmentForm {
  assigned_to: string[];
  deadline: string;
  validation_deadline: string;
  validators: string[];
  file_extension: string;
  comment: string;
}

interface VisaWorkflowAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: AssignmentForm) => void;
  intervenants: Intervenant[];
  loadingIntervenants: boolean;
  selectedTask: {
    phase: 'conception' | 'realisation';
    section: string;
    subsection: string;
    taskName: string;
  } | null;
  isEditing: boolean;
  initialForm?: AssignmentForm;
}

const FILE_EXTENSIONS = [
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'doc', label: 'Word (.doc)' },
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'xls', label: 'Excel (.xls)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'jpg', label: 'Image JPEG (.jpg, .jpeg)' },
  { value: 'png', label: 'Image PNG (.png)' },
  { value: 'zip', label: 'Archive ZIP (.zip)' },
  { value: 'dwg', label: 'AutoCAD (.dwg)' },
  { value: 'other', label: 'Autre' }
];

export const VisaWorkflowAssignmentDialog: React.FC<VisaWorkflowAssignmentDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  intervenants,
  loadingIntervenants,
  selectedTask,
  isEditing,
  initialForm
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<AssignmentForm>({
    assigned_to: [],
    deadline: '',
    validation_deadline: '',
    validators: [],
    file_extension: 'pdf',
    comment: ''
  });

  useEffect(() => {
    if (initialForm) {
      setForm(initialForm);
    }
  }, [initialForm, isOpen]);

  const filteredIntervenants = intervenants.filter(i => 
    i.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle un intervenant comme exécutant
  const toggleExecutor = (userId: string) => {
    setForm(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(userId)
        ? prev.assigned_to.filter(id => id !== userId)
        : [...prev.assigned_to, userId]
    }));
  };

  // Toggle un intervenant comme validateur
  const toggleValidator = (userId: string) => {
    setForm(prev => ({
      ...prev,
      validators: prev.validators.includes(userId)
        ? prev.validators.filter(id => id !== userId)
        : [...prev.validators, userId]
    }));
  };

  // Déplacer un validateur vers le haut
  const moveValidatorUp = (index: number) => {
    if (index === 0) return;
    setForm(prev => {
      const newValidators = [...prev.validators];
      [newValidators[index], newValidators[index - 1]] = [newValidators[index - 1], newValidators[index]];
      return { ...prev, validators: newValidators };
    });
  };

  // Déplacer un validateur vers le bas
  const moveValidatorDown = (index: number) => {
    if (index === form.validators.length - 1) return;
    setForm(prev => {
      const newValidators = [...prev.validators];
      [newValidators[index], newValidators[index + 1]] = [newValidators[index + 1], newValidators[index]];
      return { ...prev, validators: newValidators };
    });
  };

  // Validation
  const validateForm = (): string | null => {
    if (form.assigned_to.length === 0) return 'Veuillez sélectionner au moins un exécutant';
    if (form.validators.length === 0) return 'Veuillez sélectionner au moins un validateur';
    if (form.assigned_to.some(id => form.validators.includes(id))) {
      return 'Un intervenant ne peut pas être à la fois exécutant et validateur';
    }
    if (!form.deadline) return 'Veuillez définir une date limite de réalisation';
    if (!form.validation_deadline) return 'Veuillez définir une date limite de validation';
    return null;
  };

  const handleSubmit = () => {
    const error = validateForm();
    if (error) {
      // Afficher l'erreur via toast si disponible, sinon alert
      alert(error);
      return;
    }
    onSubmit(form);
  };

  const availableForValidation = intervenants.filter(i => !form.assigned_to.includes(i.user_id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'assignation' : 'Assigner avec Workflow VISA'}
          </DialogTitle>
          <DialogDescription>
            {selectedTask && (
              <span className="text-sm text-gray-500">
                {selectedTask.taskName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info workflow VISA */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Workflow VISA activé</p>
                <p className="mt-1">
                  Les validateurs examineront le document dans l'ordre défini. 
                  Chaque validateur peut donner un avis : Favorable (F), Défavorable (D), 
                  Suspendu (S) ou Hors Mission (HM).
                </p>
              </div>
            </div>
          </div>

          {/* Sélection des exécutants */}
          <div className="space-y-2">
            <Label>Exécutants (ceux qui réalisent et uploadent) *</Label>
            <div className="border rounded-lg p-3 space-y-3">
              <Input
                placeholder="Rechercher un intervenant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2"
              />
              {loadingIntervenants ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredIntervenants.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  Aucun intervenant disponible
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredIntervenants.map((intervenant) => (
                    <label
                      key={intervenant.user_id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={form.assigned_to.includes(intervenant.user_id)}
                        onCheckedChange={() => toggleExecutor(intervenant.user_id)}
                      />
                      <span className="text-sm flex-1">
                        {intervenant.first_name} {intervenant.last_name}
                        {intervenant.specialty && (
                          <span className="text-gray-500 text-xs ml-1">({intervenant.specialty})</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {form.assigned_to.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.assigned_to.map(userId => {
                  const intervenant = intervenants.find(i => i.user_id === userId);
                  return intervenant ? (
                    <Badge key={userId} variant="secondary" className="gap-1">
                      {intervenant.first_name} {intervenant.last_name}
                      <button
                        onClick={() => toggleExecutor(userId)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Sélection des validateurs avec ordre */}
          <div className="space-y-2">
            <Label>Validateurs (ordre de validation) *</Label>
            <p className="text-xs text-gray-500">
              Les validateurs ne peuvent pas être des exécutants. 
              Utilisez les flèches pour définir l'ordre.
            </p>
            <div className="border rounded-lg p-3">
              {loadingIntervenants ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : availableForValidation.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  Aucun intervenant disponible (tous sont exécutants)
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableForValidation.map((intervenant) => (
                    <label
                      key={intervenant.user_id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={form.validators.includes(intervenant.user_id)}
                        onCheckedChange={() => toggleValidator(intervenant.user_id)}
                      />
                      <span className="text-sm flex-1">
                        {intervenant.first_name} {intervenant.last_name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {/* Liste ordonnée des validateurs */}
            {form.validators.length > 0 && (
              <div className="mt-3 space-y-2">
                <Label className="text-sm">Ordre de validation :</Label>
                <div className="space-y-1">
                  {form.validators.map((userId, index) => {
                    const intervenant = intervenants.find(i => i.user_id === userId);
                    if (!intervenant) return null;
                    return (
                      <div 
                        key={userId} 
                        className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="flex-1 text-sm">
                          {intervenant.first_name} {intervenant.last_name}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveValidatorUp(index)}
                            disabled={index === 0}
                            className="p-1 hover:bg-blue-200 rounded disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => moveValidatorDown(index)}
                            disabled={index === form.validators.length - 1}
                            className="p-1 hover:bg-blue-200 rounded disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleValidator(userId)}
                            className="p-1 hover:bg-red-100 text-red-600 rounded ml-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Date limite réalisation *</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validation_deadline">Date limite validation *</Label>
              <Input
                id="validation_deadline"
                type="date"
                value={form.validation_deadline}
                onChange={(e) => setForm(prev => ({ ...prev, validation_deadline: e.target.value }))}
              />
            </div>
          </div>

          {/* Extension de fichier */}
          <div className="space-y-2">
            <Label htmlFor="file_extension">Type de fichier attendu *</Label>
            <Select
              value={form.file_extension}
              onValueChange={(value) => setForm(prev => ({ ...prev, file_extension: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILE_EXTENSIONS.map(ext => (
                  <SelectItem key={ext.value} value={ext.value}>{ext.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commentaire */}
          <div className="space-y-2">
            <Label htmlFor="comment">Instructions pour le workflow</Label>
            <Textarea
              id="comment"
              placeholder="Instructions spécifiques pour les exécutants et validateurs..."
              value={form.comment}
              onChange={(e) => setForm(prev => ({ ...prev, comment: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <SubmitButton onClick={handleSubmit} loadingText="Assignation...">
            {isEditing ? 'Mettre à jour' : 'Assigner'}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
