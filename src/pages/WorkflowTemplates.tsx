import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubmitButton } from '@/components/ui/submit-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  FileCheck,
  ArrowRight,
  ArrowDown
} from 'lucide-react';
import { 
  WorkflowTemplate, 
  WorkflowStep,
  WorkflowType,
  WORKFLOW_TYPE_LABELS 
} from '@/types/visa';

// Mock templates
const MOCK_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Validation Plans Standard',
    type: 'sequentiel',
    steps: [
      { id: 's1', order: 1, role: 'Architecte', status: 'en_attente' },
      { id: 's2', order: 2, role: 'BET', status: 'en_attente' },
      { id: 's3', order: 3, role: 'Client', status: 'en_attente' }
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'tpl-2',
    name: 'Validation DOE Rapide',
    type: 'parallele',
    steps: [
      { id: 's1', order: 1, role: 'MOE', status: 'en_attente' },
      { id: 's2', order: 1, role: 'Contrôleur', status: 'en_attente' }
    ],
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  }
];

const AVAILABLE_ROLES = [
  'Architecte',
  'BET',
  'MOE',
  'Contrôleur',
  'Client',
  'Chef de projet',
  'Entreprise Générale',
  'Spécialiste',
  'Bureau de contrôle'
];

const WorkflowTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(MOCK_TEMPLATES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  
  // New template form state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<WorkflowType>('sequentiel');
  const [newSteps, setNewSteps] = useState<WorkflowStep[]>([
    { id: 'new-1', order: 1, role: '', status: 'en_attente' }
  ]);

  const handleAddStep = () => {
    setNewSteps([
      ...newSteps,
      { 
        id: `new-${newSteps.length + 1}`, 
        order: newTemplateType === 'sequentiel' ? newSteps.length + 1 : 1, 
        role: '', 
        status: 'en_attente' 
      }
    ]);
  };

  const handleRemoveStep = (stepId: string) => {
    const updatedSteps = newSteps.filter(s => s.id !== stepId);
    // Reorder if sequential
    if (newTemplateType === 'sequentiel') {
      updatedSteps.forEach((step, index) => {
        step.order = index + 1;
      });
    }
    setNewSteps(updatedSteps);
  };

  const handleStepRoleChange = (stepId: string, role: string) => {
    setNewSteps(newSteps.map(s => 
      s.id === stepId ? { ...s, role } : s
    ));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (newTemplateType !== 'sequentiel') return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSteps.length) return;

    const updatedSteps = [...newSteps];
    [updatedSteps[index], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[index]];
    
    // Update orders
    updatedSteps.forEach((step, idx) => {
      step.order = idx + 1;
    });
    
    setNewSteps(updatedSteps);
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('Veuillez saisir un nom pour le template');
      return;
    }

    if (newSteps.some(s => !s.role)) {
      alert('Veuillez sélectionner un rôle pour chaque étape');
      return;
    }

    const template: WorkflowTemplate = {
      id: editingTemplate?.id || `tpl-${Date.now()}`,
      name: newTemplateName,
      type: newTemplateType,
      steps: newSteps,
      createdAt: editingTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingTemplate) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? template : t));
    } else {
      setTemplates([...templates, template]);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) {
      setTemplates(templates.filter(t => t.id !== templateId));
    }
  };

  const handleEditTemplate = (template: WorkflowTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplateType(template.type);
    setNewSteps(template.steps.map(s => ({ ...s })));
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setNewTemplateName('');
    setNewTemplateType('sequentiel');
    setNewSteps([{ id: 'new-1', order: 1, role: '', status: 'en_attente' }]);
    setEditingTemplate(null);
  };

  const getTypeBadge = (type: WorkflowType) => {
    const colors = type === 'sequentiel' 
      ? 'bg-blue-100 text-blue-700' 
      : 'bg-purple-100 text-purple-700';
    return (
      <Badge className={colors}>
        {WORKFLOW_TYPE_LABELS[type]}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/dashboard/projets')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-blue-600" />
              Templates de Workflow
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez les modèles de workflow de validation
            </p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Modifier le template' : 'Créer un template'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Template Info */}
              <div className="space-y-2">
                <Label>Nom du template</Label>
                <Input 
                  placeholder="Ex: Validation Plans Standard"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Type de workflow</Label>
                <Select 
                  value={newTemplateType} 
                  onValueChange={(v) => setNewTemplateType(v as WorkflowType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequentiel">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4" />
                        Séquentiel (une étape à la fois)
                      </div>
                    </SelectItem>
                    <SelectItem value="parallele">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Parallèle (tous en même temps)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Étapes de validation</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAddStep}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter une étape
                  </Button>
                </div>

                <div className="space-y-2">
                  {newSteps.map((step, index) => (
                    <div 
                      key={step.id}
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">
                        {newTemplateType === 'sequentiel' ? index + 1 : 1}
                      </Badge>

                      <Select 
                        value={step.role} 
                        onValueChange={(v) => handleStepRoleChange(step.id, v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {newTemplateType === 'sequentiel' && newSteps.length > 1 && (
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleMoveStep(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowRight className="h-4 w-4 -rotate-90" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleMoveStep(index, 'down')}
                            disabled={index === newSteps.length - 1}
                          >
                            <ArrowRight className="h-4 w-4 rotate-90" />
                          </Button>
                        </div>
                      )}

                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveStep(step.id)}
                        disabled={newSteps.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <SubmitButton onClick={handleSaveTemplate} loadingText="Sauvegarde...">
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? 'Enregistrer' : 'Créer'}
              </SubmitButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      <div className="grid gap-6">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun template créé</p>
              <Button 
                className="mt-4"
                onClick={() => { resetForm(); setIsDialogOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un template
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getTypeBadge(template.type)}
                        <span className="text-sm text-gray-500">
                          {template.steps.length} étape{template.steps.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      Modifier
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {template.steps.map((step, index) => (
                    <div 
                      key={step.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">
                        {template.type === 'sequentiel' ? index + 1 : '•'}
                      </Badge>
                      <span className="font-medium">{step.role}</span>
                      {template.type === 'sequentiel' && index < template.steps.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkflowTemplates;
