import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Save, 
  Trash2, 
  Edit2, 
  X, 
  Search,
  ChevronRight,
  ChevronDown,
  Layout,
  Info,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ProjectInfoSheet {
  id: string;
  project_id: string;
  task_id: string | null;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

interface ProjectTask {
  id: string;
  title: string;
  order_index: number;
}

interface ProjectSubsection {
  id: string;
  title: string;
  status: string;
  tasks: ProjectTask[];
}

interface ProjectSection {
  id: string;
  title: string;
  status: string;
  items: ProjectSubsection[];
}

interface ProjectInfoSheetsTabProps {
  projectId: string;
  isAdmin: boolean;
  conceptionStructure: ProjectSection[];
  realizationStructure: ProjectSection[];
}

const ProjectInfoSheetsTab: React.FC<ProjectInfoSheetsTabProps> = ({ 
  projectId, 
  isAdmin,
  conceptionStructure,
  realizationStructure
}) => {
  const { toast } = useToast();
  const [activePhase, setActivePhase] = useState<'conception' | 'realisation'>('conception');
  const [sheets, setSheets] = useState<ProjectInfoSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSheet, setEditingSheet] = useState<Partial<ProjectInfoSheet> | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ id: string, title: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSheets();
  }, [projectId]);

  const fetchSheets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_info_sheets')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setSheets(data || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les fiches informatives',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingSheet?.title) {
      toast({
        title: 'Erreur',
        description: 'Le titre est obligatoire',
        variant: 'destructive'
      });
      return;
    }

    try {
      const isNew = !editingSheet.id;
      const sheetData = {
        project_id: projectId,
        title: editingSheet.title,
        content: editingSheet.content || '',
        task_id: selectedTask?.id || editingSheet.task_id || null,
        updated_at: new Date().toISOString()
      };

      if (isNew) {
        const { error } = await supabase
          .from('project_info_sheets')
          .insert([sheetData]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_info_sheets')
          .update(sheetData)
          .eq('id', editingSheet.id);
        if (error) throw error;
      }

      toast({
        title: 'Succès',
        description: `Fiche informative ${isNew ? 'créée' : 'mise à jour'} avec succès`
      });
      setEditingSheet(null);
      setSelectedTask(null);
      fetchSheets();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette fiche ?')) return;

    try {
      const { error } = await supabase
        .from('project_info_sheets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Fiche informative supprimée'
      });
      fetchSheets();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const currentStructure = activePhase === 'conception' ? conceptionStructure : realizationStructure;

  const getSheetForTask = (taskId: string) => {
    return sheets.find(s => s.task_id === taskId);
  };

  const handleEditTaskSheet = (task: ProjectTask, existingSheet?: ProjectInfoSheet) => {
    setSelectedTask({ id: task.id, title: task.title });
    if (existingSheet) {
      setEditingSheet(existingSheet);
    } else {
      setEditingSheet({
        title: `Fiche : ${task.title}`,
        content: '',
        task_id: task.id
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-300px)]">
      {/* Colonne de gauche : Structure du projet */}
      <Card className="md:col-span-5 flex flex-col overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Structure du Projet
            </CardTitle>
          </div>
          <Tabs value={activePhase} onValueChange={(v: any) => setActivePhase(v)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="conception">Conception</TabsTrigger>
              <TabsTrigger value="realisation">Réalisation</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-hide">
          <Accordion type="multiple" className="w-full">
            {currentStructure.map((section) => (
              <AccordionItem key={section.id} value={section.id} className="border-b border-slate-100">
                <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 transition-colors data-[state=open]:bg-blue-50/30">
                  <div className="flex items-center gap-3 text-left">
                    <span className="font-semibold text-slate-800">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  {section.items.map((item) => (
                    <div key={item.id} className="border-t border-slate-50">
                      <div className="px-6 py-2 bg-slate-50/50 font-medium text-sm text-slate-600 flex items-center gap-2">
                        <ChevronRight className="h-3 w-3" />
                        {item.title}
                      </div>
                      <div className="divide-y divide-slate-50">
                        {item.tasks.map((task) => {
                          const sheet = getSheetForTask(task.id);
                          const isSelected = selectedTask?.id === task.id;
                          return (
                            <div 
                              key={task.id}
                              className={`px-8 py-3 flex items-center justify-between hover:bg-blue-50/50 transition-all cursor-pointer group ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                              onClick={() => handleEditTaskSheet(task, sheet)}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <span className={`text-sm ${isSelected ? 'font-bold text-blue-700' : 'text-slate-600'}`}>
                                  {task.title}
                                </span>
                                {sheet && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 shrink-0">
                                    <Info className="h-3 w-3 mr-1" />
                                    Fiche
                                  </Badge>
                                )}
                              </div>
                              <ChevronRight className={`h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 ${isSelected ? 'text-blue-500' : ''}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Colonne de droite : Éditeur de fiche */}
      <Card className="md:col-span-7 flex flex-col overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {editingSheet ? (editingSheet.id ? 'Modifier la fiche' : 'Créer une fiche') : 'Détails de la fiche'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          {!editingSheet ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-4">
              <div className="p-4 bg-slate-100 rounded-full">
                <Layout className="h-10 w-10 opacity-20" />
              </div>
              <div>
                <p className="font-medium">Sélectionnez une tâche à gauche</p>
                <p className="text-sm">pour consulter ou créer sa fiche informative</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-md text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Tâche sélectionnée</p>
                  <p className="text-sm font-bold text-blue-900">{selectedTask?.title}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Titre de la fiche</label>
                <Input 
                  placeholder="Ex: Spécifications techniques..."
                  value={editingSheet.title || ''}
                  onChange={e => setEditingSheet(prev => ({ ...prev, title: e.target.value }))}
                  disabled={!isAdmin}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Contenu informatif</label>
                <Textarea 
                  placeholder="Saisissez ici les informations détaillées pour cette tâche..."
                  className="min-h-[300px] bg-white leading-relaxed"
                  value={editingSheet.content || ''}
                  onChange={e => setEditingSheet(prev => ({ ...prev, content: e.target.value }))}
                  disabled={!isAdmin}
                />
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  {editingSheet.id && (
                    <Button 
                      variant="ghost" 
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleDelete(editingSheet.id!)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer la fiche
                    </Button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" onClick={() => { setEditingSheet(null); setSelectedTask(null); }}>
                      Annuler
                    </Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer la fiche
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectInfoSheetsTab;
