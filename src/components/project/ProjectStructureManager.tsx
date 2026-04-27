import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, FileText } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from "@/lib/supabase";
import { format, parseISO } from 'date-fns';

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '';
  try {
    // Si c'est un format ISO complet avec T, on prend juste la partie date
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const date = parseISO(datePart);
    return format(date, 'dd/MM/yyyy');
  } catch (e) {
    return dateStr;
  }
};

interface SnapshotSection { id: string; title: string; phase: string; order_index: number; items: SnapshotItem[]; deadline?: string; start_date?: string; end_date?: string; }
interface SnapshotItem    { id: string; section_id: string; title: string; order_index: number; tasks: SnapshotTask[]; deadline?: string; start_date?: string; end_date?: string; }
interface SnapshotTask    { id: string; item_id: string; title: string; order_index: number; info_sheet: string; }

interface ProjectStructureManagerProps {
  projectId: string;
  onStructureChange?: () => void;
}

export const ProjectStructureManager: React.FC<ProjectStructureManagerProps> = ({ projectId, onStructureChange }) => {
  const { toast } = useToast();
  const [phase, setPhase] = useState<'conception' | 'realisation'>('conception');
  const [structure, setStructure] = useState<SnapshotSection[]>([]);
  const [loading, setLoading] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems]       = useState<Set<string>>(new Set());

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingItemId,    setEditingItemId]    = useState<string | null>(null);
  const [editingTaskId,    setEditingTaskId]    = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');

  const [addingItemToSection, setAddingItemToSection] = useState<string | null>(null);
  const [addingTaskToItem,    setAddingTaskToItem]    = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newItemTitle,    setNewItemTitle]    = useState('');
  const [newTaskTitle,    setNewTaskTitle]    = useState('');

  // ── Fiches informatives ──
  const [selectedTaskId,    setSelectedTaskId]    = useState<string | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');
  const [infoSheetText, setInfoSheetText] = useState('');
  const [savingSheet, setSavingSheet] = useState(false);

  // ── Load ──
  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data: sections } = await supabase
        .from('project_sections_snapshot')
        .select('*')
        .eq('project_id', projectId)
        .eq('phase', phase)
        .order('order_index');

      const built: SnapshotSection[] = await Promise.all(
        (sections || []).map(async (sec: any) => {
          const { data: items } = await supabase
            .from('project_items_snapshot')
            .select('*')
            .eq('section_id', sec.id)
            .order('order_index');
          
          const builtItems: SnapshotItem[] = await Promise.all(
            (items || []).map(async (item: any) => {
              const { data: tasks } = await supabase
                .from('project_tasks_snapshot')
                .select('*')
                .eq('item_id', item.id)
                .order('order_index');
              return { ...item, tasks: tasks || [] };
            })
          );
          return { ...sec, items: builtItems };
        })
      );
      setStructure(built);
    } catch (error) {
      console.error('Error loading project structure:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger la structure.', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [projectId, phase, toast]);

  useEffect(() => { load(); }, [load]);

  // Ouvrir le panneau fiche pour une tâche
  const openInfoSheet = (taskId: string, taskTitle: string, currentInfo: string) => {
    setSelectedTaskId(taskId);
    setSelectedTaskTitle(taskTitle);
    setInfoSheetText(currentInfo || '');
  };

  // Sauvegarder la fiche
  const saveInfoSheet = async () => {
    if (!selectedTaskId) return;
    setSavingSheet(true);
    try {
      await supabase.from('project_tasks_snapshot')
        .update({ info_sheet: infoSheetText })
        .eq('id', selectedTaskId);
      
      setStructure(p => p.map(s => ({
        ...s,
        items: s.items.map(i => ({
          ...i,
          tasks: i.tasks.map(t => t.id === selectedTaskId ? { ...t, info_sheet: infoSheetText } : t)
        }))
      })));

      toast({ title: 'Fiche enregistrée', description: `Fiche de "${selectedTaskTitle}" sauvegardée.` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la fiche.', variant: 'destructive' });
    } finally {
      setSavingSheet(false);
    }
  };

  // ── Section CRUD ──
  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    const { data } = await supabase.from('project_sections_snapshot')
      .insert({ project_id: projectId, phase, title: newSectionTitle.trim(), order_index: structure.length })
      .select().single();
    if (data) { 
      setStructure(p => [...p, { ...data, items: [] }]); 
      setNewSectionTitle(''); 
      setAddingSection(false); 
      toast({ title: 'Section ajoutée' });
      onStructureChange?.();
    }
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from('project_sections_snapshot').delete().eq('id', id);
    if (!error) {
      setStructure(p => p.filter(s => s.id !== id));
      toast({ title: 'Section supprimée' });
      onStructureChange?.();
    }
  };

  const saveSection = async (id: string) => {
    if (editStartDate && editEndDate && editEndDate < editStartDate) {
      toast({ title: 'Erreur', description: 'La date de fin ne peut pas être antérieure à la date de début.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('project_sections_snapshot')
      .update({ 
        title: editValue, 
        deadline: editDeadline || null,
        start_date: editStartDate || null,
        end_date: editEndDate || null
      })
      .eq('id', id);
    if (!error) {
      setStructure(p => p.map(s => s.id === id ? { 
        ...s, 
        title: editValue, 
        deadline: editDeadline,
        start_date: editStartDate,
        end_date: editEndDate
      } : s));
      setEditingSectionId(null);
      setEditDeadline('');
      setEditStartDate('');
      setEditEndDate('');
      toast({ title: 'Section modifiée' });
      onStructureChange?.();
    }
  };

  // ── Item CRUD ──
  const addItem = async (sectionId: string) => {
    if (!newItemTitle.trim()) return;
    const sec = structure.find(s => s.id === sectionId);
    
    // On peut optionnellement hériter des dates de la section parente si elles existent
    const { data } = await supabase.from('project_items_snapshot')
      .insert({ 
        project_id: projectId, 
        section_id: sectionId, 
        title: newItemTitle.trim(), 
        order_index: sec?.items.length || 0,
        start_date: sec?.start_date || null,
        end_date: sec?.end_date || null,
        deadline: sec?.deadline || null
      })
      .select().single();
    if (data) {
      setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: [...s.items, { ...data, tasks: [] }] } : s));
      setNewItemTitle(''); 
      setAddingItemToSection(null);
      toast({ title: 'Sous-étape ajoutée' });
      onStructureChange?.();
    }
  };

  const deleteItem = async (sectionId: string, itemId: string) => {
    const { error } = await supabase.from('project_items_snapshot').delete().eq('id', itemId);
    if (!error) {
      setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s));
      toast({ title: 'Sous-étape supprimée' });
      onStructureChange?.();
    }
  };

  const saveItem = async (sectionId: string, itemId: string) => {
    if (editStartDate && editEndDate && editEndDate < editStartDate) {
      toast({ title: 'Erreur', description: 'La date de fin ne peut pas être antérieure à la date de début.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('project_items_snapshot')
      .update({ 
        title: editValue, 
        deadline: editDeadline || null,
        start_date: editStartDate || null,
        end_date: editEndDate || null
      })
      .eq('id', itemId);
    if (!error) {
      setStructure(p => p.map(s => s.id === sectionId ? { 
        ...s, 
        items: s.items.map(i => i.id === itemId ? { 
          ...i, 
          title: editValue, 
          deadline: editDeadline,
          start_date: editStartDate,
          end_date: editEndDate
        } : i) 
      } : s));
      setEditingItemId(null);
      setEditDeadline('');
      setEditStartDate('');
      setEditEndDate('');
      toast({ title: 'Sous-étape modifiée' });
      onStructureChange?.();
    }
  };

  // ── Task CRUD ──
  const addTask = async (sectionId: string, itemId: string) => {
    if (!newTaskTitle.trim()) return;
    const item = structure.find(s => s.id === sectionId)?.items.find(i => i.id === itemId);
    const { data } = await supabase.from('project_tasks_snapshot')
      .insert({ project_id: projectId, item_id: itemId, title: newTaskTitle.trim(), order_index: item?.tasks.length || 0 })
      .select().single();
    if (data) {
      setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, tasks: [...i.tasks, data] } : i) } : s));
      setNewTaskTitle(''); 
      setAddingTaskToItem(null);
      toast({ title: 'Tâche ajoutée' });
      onStructureChange?.();
    }
  };

  const deleteTask = async (sectionId: string, itemId: string, taskId: string) => {
    const { error } = await supabase.from('project_tasks_snapshot').delete().eq('id', taskId);
    if (!error) {
      setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, tasks: i.tasks.filter(t => t.id !== taskId) } : i) } : s));
      toast({ title: 'Tâche supprimée' });
      onStructureChange?.();
    }
  };

  const saveTask = async (sectionId: string, itemId: string, taskId: string) => {
    const { error } = await supabase.from('project_tasks_snapshot').update({ title: editValue }).eq('id', taskId);
    if (!error) {
      setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, tasks: i.tasks.map(t => t.id === taskId ? { ...t, title: editValue } : t) } : i) } : s));
      setEditingTaskId(null);
      toast({ title: 'Tâche modifiée' });
      onStructureChange?.();
    }
  };

  const toggleSection = (id: string) =>
    setExpandedSections(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleItem = (id: string) =>
    setExpandedItems(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="px-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Gestion de la structure</CardTitle>
            <CardDescription>Modifiez la structure spécifique de ce projet. Les changements s'appliquent immédiatement.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant={phase === 'conception' ? 'default' : 'outline'} size="sm" onClick={() => { setPhase('conception'); setSelectedTaskId(null); }}>Conception</Button>
            <Button variant={phase === 'realisation' ? 'default' : 'outline'} size="sm" onClick={() => { setPhase('realisation'); setSelectedTaskId(null); }}>Réalisation</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className={`grid gap-6 ${selectedTaskId ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

            {/* ── Structure Column ── */}
            <div className="space-y-3">
              {structure.map(sec => (
                <div key={sec.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-b">
                    <button
                      className="flex items-center gap-1 flex-1 text-left font-semibold text-sm"
                      onClick={() => toggleSection(sec.id)}
                    >
                      {expandedSections.has(sec.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      {editingSectionId === sec.id
                        ? (
                          <div className="flex flex-col gap-2 flex-1 ml-1" onClick={e => e.stopPropagation()}>
                            <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-sm flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && saveSection(sec.id)} />
                            <div className="flex gap-2">
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-[10px] text-muted-foreground">Début</span>
                                <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="h-7 text-xs w-full" />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-[10px] text-muted-foreground">Fin</span>
                                <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className="h-7 text-xs w-full" />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-[10px] text-muted-foreground">Échéance</span>
                                <Input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="h-7 text-xs w-full" />
                              </div>
                            </div>
                          </div>
                        )
                        : (
                          <div className="flex flex-col ml-1">
                            <span className="font-semibold">{sec.title}</span>
                            <div className="flex gap-2 text-[10px] text-muted-foreground font-normal">
                              {sec.start_date && <span>Début: {formatDate(sec.start_date)}</span>}
                              {sec.end_date && <span>Fin: {formatDate(sec.end_date)}</span>}
                              {sec.deadline && <span>Échéance: {formatDate(sec.deadline)}</span>}
                            </div>
                          </div>
                        )}
                    </button>
                    <div className="flex gap-1 shrink-0">
                      {editingSectionId === sec.id ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={() => saveSection(sec.id)}><Check className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => { setEditingSectionId(null); setEditDeadline(''); }}><X className="h-3 w-3" /></Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { 
                            setEditingSectionId(sec.id); 
                            setEditValue(sec.title); 
                            setEditDeadline(sec.deadline ? sec.deadline.split('T')[0] : ''); 
                            setEditStartDate(sec.start_date ? sec.start_date.split('T')[0] : '');
                            setEditEndDate(sec.end_date ? sec.end_date.split('T')[0] : '');
                          }}><Pencil className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => deleteSection(sec.id)}><Trash2 className="h-3 w-3" /></Button>
                        </>
                      )}
                    </div>
                  </div>

                  {expandedSections.has(sec.id) && (
                    <div className="p-2 space-y-2 bg-white">
                      {sec.items.map(item => (
                        <div key={item.id} className="border rounded-md overflow-hidden ml-4">
                          <div className="flex items-center gap-2 bg-gray-50/70 px-3 py-1.5">
                            <button className="flex items-center gap-1 flex-1 text-left text-sm" onClick={() => toggleItem(item.id)}>
                              {expandedItems.has(item.id) ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                              {editingItemId === item.id
                                ? (
                                  <div className="flex flex-col gap-2 flex-1 ml-1" onClick={e => e.stopPropagation()}>
                                    <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-6 text-xs flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && saveItem(sec.id, item.id)} />
                                    <div className="flex gap-2">
                                      <div className="flex flex-col gap-1 flex-1">
                                        <span className="text-[9px] text-muted-foreground">Début</span>
                                        <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="h-6 text-[10px] w-full" />
                                      </div>
                                      <div className="flex flex-col gap-1 flex-1">
                                        <span className="text-[9px] text-muted-foreground">Fin</span>
                                        <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className="h-6 text-[10px] w-full" />
                                      </div>
                                      <div className="flex flex-col gap-1 flex-1">
                                        <span className="text-[9px] text-muted-foreground">Échéance</span>
                                        <Input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="h-6 text-[10px] w-full" />
                                      </div>
                                    </div>
                                  </div>
                                )
                                : (
                                  <div className="flex flex-col ml-1">
                                    <span className="font-medium">{item.title}</span>
                                    <div className="flex gap-2 text-[9px] text-muted-foreground font-normal">
                                      {item.start_date && <span>Début: {formatDate(item.start_date)}</span>}
                                      {item.end_date && <span>Fin: {formatDate(item.end_date)}</span>}
                                      {item.deadline && <span>Échéance: {formatDate(item.deadline)}</span>}
                                    </div>
                                  </div>
                                )}
                            </button>
                            <div className="flex gap-1">
                              {editingItemId === item.id ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 text-green-600" onClick={() => saveItem(sec.id, item.id)}><Check className="h-2.5 w-2.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 text-red-600" onClick={() => { setEditingItemId(null); setEditDeadline(''); }}><X className="h-2.5 w-2.5" /></Button>
                                </>
                              ) : (
                                <>
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { 
                                    setEditingItemId(item.id); 
                                    setEditValue(item.title); 
                                    setEditDeadline(item.deadline ? item.deadline.split('T')[0] : ''); 
                                    setEditStartDate(item.start_date ? item.start_date.split('T')[0] : '');
                                    setEditEndDate(item.end_date ? item.end_date.split('T')[0] : '');
                                  }}><Pencil className="h-2.5 w-2.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 text-red-500 hover:text-red-700" onClick={() => deleteItem(sec.id, item.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                                </>
                              )}
                            </div>
                          </div>

                          {expandedItems.has(item.id) && (
                            <div className="p-2 space-y-1 bg-white">
                              {item.tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2 pl-6 pr-2 py-1 hover:bg-gray-50 rounded group">
                                  {editingTaskId === task.id ? (
                                    <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-6 text-xs flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && saveTask(sec.id, item.id, task.id)} />
                                  ) : (
                                    <span className="text-xs flex-1">{task.title}</span>
                                  )}
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {editingTaskId === task.id ? (
                                      <>
                                        <Button size="icon" variant="ghost" className="h-5 w-5 text-green-600" onClick={() => saveTask(sec.id, item.id, task.id)}><Check className="h-2.5 w-2.5" /></Button>
                                        <Button size="icon" variant="ghost" className="h-5 w-5 text-red-600" onClick={() => setEditingTaskId(null)}><X className="h-2.5 w-2.5" /></Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openInfoSheet(task.id, task.title, task.info_sheet)} title="Fiche info"><FileText className="h-2.5 w-2.5" /></Button>
                                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { setEditingTaskId(task.id); setEditValue(task.title); }}><Pencil className="h-2.5 w-2.5" /></Button>
                                        <Button size="icon" variant="ghost" className="h-5 w-5 text-red-500" onClick={() => deleteTask(sec.id, item.id, task.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {addingTaskToItem === item.id ? (
                                <div className="flex gap-1 pl-6 pt-1">
                                  <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Nouvelle tâche..." className="h-6 text-xs" autoFocus onKeyDown={e => e.key === 'Enter' && addTask(sec.id, item.id)} />
                                  <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => addTask(sec.id, item.id)}>Ajouter</Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setAddingTaskToItem(null)}><X className="h-3 w-3" /></Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] pl-6 text-muted-foreground" onClick={() => setAddingTaskToItem(item.id)}><Plus className="h-3 w-3 mr-1" /> Ajouter une tâche</Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {addingItemToSection === sec.id ? (
                        <div className="flex gap-1 ml-4 pt-1">
                          <Input value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Nouvelle sous-étape..." className="h-7 text-xs" autoFocus onKeyDown={e => e.key === 'Enter' && addItem(sec.id)} />
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => addItem(sec.id)}>Ajouter</Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAddingItemToSection(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs ml-4 text-muted-foreground" onClick={() => setAddingItemToSection(sec.id)}><Plus className="h-3 w-3 mr-1" /> Ajouter une sous-étape</Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {addingSection ? (
                <div className="flex gap-1 border p-2 rounded-lg bg-gray-50">
                  <Input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="Nouvelle étape..." className="h-8 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && addSection()} />
                  <Button size="sm" className="h-8" onClick={addSection}>Ajouter</Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAddingSection(false)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full border-dashed" onClick={() => setAddingSection(true)}><Plus className="h-4 w-4 mr-2" /> Ajouter une étape</Button>
              )}
            </div>

            {/* ── Info Sheet Panel ── */}
            {selectedTaskId && (
              <div className="border rounded-lg bg-gray-50/50 p-4 flex flex-col gap-4 sticky top-6 self-start">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-semibold text-sm">Fiche : {selectedTaskTitle}</h3>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedTaskId(null)}><X className="h-4 w-4" /></Button>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Contenu de la fiche informative</p>
                  <Textarea value={infoSheetText} onChange={e => setInfoSheetText(e.target.value)} placeholder="Décrivez les instructions pour cette tâche..." className="min-h-[250px] bg-white text-sm" />
                </div>
                <Button className="w-full" onClick={saveInfoSheet} disabled={savingSheet}>
                  {savingSheet ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Sauvegarder la fiche
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
