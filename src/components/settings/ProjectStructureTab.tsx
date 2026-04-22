import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, FileText, Save } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from "@/lib/supabase";
import { projectStructure, realizationStructure } from "@/data/project-structure";
import { invalidateTenantStructureCache } from "@/hooks/useProjectStructure";

interface TenantSection { id: string; title: string; phase: string; order_index: number; items: TenantItem[]; }
interface TenantItem   { id: string; section_id: string; title: string; order_index: number; tasks: TenantTask[]; }
interface TenantTask   { id: string; item_id: string; title: string; order_index: number; }
interface TenantInfoSheet { id?: string; tenant_task_id: string; info_sheet: string; }

interface ProjectStructureTabProps {
  tenantId: string;
}

export const ProjectStructureTab: React.FC<ProjectStructureTabProps> = ({ tenantId }) => {
  const { toast } = useToast();
  const [phase, setPhase] = useState<'conception' | 'realisation'>('conception');
  const [structure, setStructure] = useState<TenantSection[]>([]);
  const [loading, setLoading] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems]       = useState<Set<string>>(new Set());

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingItemId,    setEditingItemId]    = useState<string | null>(null);
  const [editingTaskId,    setEditingTaskId]    = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [addingItemToSection, setAddingItemToSection] = useState<string | null>(null);
  const [addingTaskToItem,    setAddingTaskToItem]    = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newItemTitle,    setNewItemTitle]    = useState('');
  const [newTaskTitle,    setNewTaskTitle]    = useState('');

  // ── Fiches informatives ──
  // Map: tenant_task_id → TenantInfoSheet
  const [infoSheets, setInfoSheets] = useState<Record<string, TenantInfoSheet>>({});
  const [selectedTaskId,    setSelectedTaskId]    = useState<string | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');
  const [infoSheetText, setInfoSheetText] = useState('');
  const [savingSheet, setSavingSheet] = useState(false);

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sections } = await supabase
        .from('tenant_project_sections')
        .select('*').eq('tenant_id', tenantId).eq('phase', phase).order('order_index');

      const built: TenantSection[] = await Promise.all(
        (sections || []).map(async (sec: any) => {
          const { data: items } = await supabase
            .from('tenant_project_items').select('*').eq('section_id', sec.id).order('order_index');
          const builtItems: TenantItem[] = await Promise.all(
            (items || []).map(async (item: any) => {
              const { data: tasks } = await supabase
                .from('tenant_project_tasks').select('*').eq('item_id', item.id).order('order_index');
              return { ...item, tasks: tasks || [] };
            })
          );
          return { ...sec, items: builtItems };
        })
      );
      setStructure(built);

      // Charger toutes les fiches pour cette phase
      const allTaskIds = built.flatMap(s => s.items.flatMap(i => i.tasks.map(t => t.id)));
      if (allTaskIds.length > 0) {
        const { data: sheets } = await supabase
          .from('tenant_task_info_sheets').select('*').in('tenant_task_id', allTaskIds);
        const map: Record<string, TenantInfoSheet> = {};
        (sheets || []).forEach((s: any) => { map[s.tenant_task_id] = s; });
        setInfoSheets(prev => ({ ...prev, ...map }));
      }
    } finally { setLoading(false); }
  }, [tenantId, phase]);

  // Ouvrir le panneau fiche pour une tâche
  const openInfoSheet = (taskId: string, taskTitle: string) => {
    setSelectedTaskId(taskId);
    setSelectedTaskTitle(taskTitle);
    setInfoSheetText(infoSheets[taskId]?.info_sheet || '');
  };

  // Fermer le panneau fiche
  const closeInfoSheet = () => {
    setSelectedTaskId(null);
    setSelectedTaskTitle('');
    setInfoSheetText('');
  };

  // Sauvegarder la fiche
  const saveInfoSheet = async () => {
    if (!selectedTaskId) return;
    setSavingSheet(true);
    try {
      const existing = infoSheets[selectedTaskId];
      if (existing?.id) {
        await supabase.from('tenant_task_info_sheets')
          .update({ info_sheet: infoSheetText, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        setInfoSheets(prev => ({ ...prev, [selectedTaskId]: { ...existing, info_sheet: infoSheetText } }));
      } else {
        const { data } = await supabase.from('tenant_task_info_sheets')
          .insert({ tenant_task_id: selectedTaskId, info_sheet: infoSheetText })
          .select().single();
        if (data) setInfoSheets(prev => ({ ...prev, [selectedTaskId]: data }));
      }
      toast({ title: 'Fiche enregistrée', description: `Fiche de "${selectedTaskTitle}" sauvegardée.` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la fiche.', variant: 'destructive' });
    } finally {
      setSavingSheet(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  // ── Init from default ──
  const initFromDefault = async () => {
    setLoading(true);
    try {
      const defaults = phase === 'conception' ? projectStructure : realizationStructure;
      for (let si = 0; si < defaults.length; si++) {
        const s = defaults[si];
        const { data: ns } = await supabase.from('tenant_project_sections')
          .insert({ tenant_id: tenantId, phase, title: s.title, original_id: s.id, order_index: si })
          .select().single();
        if (!ns) continue;
        for (let ii = 0; ii < s.items.length; ii++) {
          const it = s.items[ii];
          const { data: ni } = await supabase.from('tenant_project_items')
            .insert({ section_id: ns.id, title: it.title, original_id: it.id, order_index: ii })
            .select().single();
          if (!ni) continue;
          for (let ti = 0; ti < it.tasks.length; ti++) {
            await supabase.from('tenant_project_tasks')
              .insert({ item_id: ni.id, title: it.tasks[ti], order_index: ti });
          }
        }
      }
      toast({ title: "Structure initialisée", description: "La structure par défaut a été copiée." });
      await load();
    } finally { setLoading(false); }
  };

  // ── Section CRUD ──
  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    const { data } = await supabase.from('tenant_project_sections')
      .insert({ tenant_id: tenantId, phase, title: newSectionTitle.trim(), order_index: structure.length })
      .select().single();
    if (data) { invalidateTenantStructureCache(tenantId); setStructure(p => [...p, { ...data, items: [] }]); setNewSectionTitle(''); setAddingSection(false); }
  };
  const deleteSection = async (id: string) => {
    await supabase.from('tenant_project_sections').delete().eq('id', id);
    invalidateTenantStructureCache(tenantId);
    setStructure(p => p.filter(s => s.id !== id));
  };
  const saveSection = async (id: string) => {
    await supabase.from('tenant_project_sections').update({ title: editValue }).eq('id', id);
    invalidateTenantStructureCache(tenantId);
    setStructure(p => p.map(s => s.id === id ? { ...s, title: editValue } : s));
    setEditingSectionId(null);
  };

  // ── Item CRUD ──
  const addItem = async (sectionId: string) => {
    if (!newItemTitle.trim()) return;
    const sec = structure.find(s => s.id === sectionId);
    const { data } = await supabase.from('tenant_project_items')
      .insert({ section_id: sectionId, title: newItemTitle.trim(), order_index: sec?.items.length || 0 })
      .select().single();
    if (data) {
      invalidateTenantStructureCache(tenantId);
      setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: [...s.items, { ...data, tasks: [] }] } : s));
      setNewItemTitle(''); setAddingItemToSection(null);
    }
  };
  const deleteItem = async (sectionId: string, itemId: string) => {
    await supabase.from('tenant_project_items').delete().eq('id', itemId);
    invalidateTenantStructureCache(tenantId);
    setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s));
  };
  const saveItem = async (sectionId: string, itemId: string) => {
    await supabase.from('tenant_project_items').update({ title: editValue }).eq('id', itemId);
    invalidateTenantStructureCache(tenantId);
    setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, title: editValue } : i) } : s));
    setEditingItemId(null);
  };

  // ── Task CRUD ──
  const addTask = async (sectionId: string, itemId: string) => {
    if (!newTaskTitle.trim()) return;
    const item = structure.find(s => s.id === sectionId)?.items.find(i => i.id === itemId);
    const { data } = await supabase.from('tenant_project_tasks')
      .insert({ item_id: itemId, title: newTaskTitle.trim(), order_index: item?.tasks.length || 0 })
      .select().single();
    if (data) {
      invalidateTenantStructureCache(tenantId);
      setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, tasks: [...i.tasks, data] } : i) } : s));
      setNewTaskTitle(''); setAddingTaskToItem(null);
    }
  };
  const deleteTask = async (sectionId: string, itemId: string, taskId: string) => {
    await supabase.from('tenant_project_tasks').delete().eq('id', taskId);
    invalidateTenantStructureCache(tenantId);
    setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, tasks: i.tasks.filter(t => t.id !== taskId) } : i) } : s));
  };
  const saveTask = async (sectionId: string, itemId: string, taskId: string) => {
    await supabase.from('tenant_project_tasks').update({ title: editValue }).eq('id', taskId);
    invalidateTenantStructureCache(tenantId);
    setStructure(p => p.map(s => s.id === sectionId ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, tasks: i.tasks.map(t => t.id === taskId ? { ...t, title: editValue } : t) } : i) } : s));
    setEditingTaskId(null);
  };

  const toggleSection = (id: string) =>
    setExpandedSections(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleItem = (id: string) =>
    setExpandedItems(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Structure des projets</CardTitle>
            <CardDescription>Personnalisez les étapes, sous-étapes et tâches. Cliquez sur <FileText className="inline h-3 w-3" /> pour définir la fiche informative d'une tâche.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant={phase === 'conception' ? 'default' : 'outline'} size="sm" onClick={() => { setPhase('conception'); closeInfoSheet(); }}>Conception</Button>
            <Button variant={phase === 'realisation' ? 'default' : 'outline'} size="sm" onClick={() => { setPhase('realisation'); closeInfoSheet(); }}>Réalisation</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : structure.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">Aucune structure personnalisée pour la phase <strong>{phase}</strong>.</p>
            <Button onClick={initFromDefault}><Plus className="h-4 w-4 mr-2" />Initialiser depuis la structure par défaut</Button>
          </div>
        ) : (
          <div className={`grid gap-6 ${selectedTaskId ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

            {/* ── Colonne structure ── */}
            <div className="space-y-3">
              {structure.map(sec => (
                <div key={sec.id} className="border rounded-lg overflow-hidden">
                  {/* Section row */}
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-b">
                    <button
                      className="flex items-center gap-1 flex-1 text-left font-semibold text-sm"
                      onClick={() => toggleSection(sec.id)}
                    >
                      {expandedSections.has(sec.id)
                        ? <ChevronDown className="h-4 w-4 shrink-0" />
                        : <ChevronRight className="h-4 w-4 shrink-0" />}
                      {editingSectionId === sec.id
                        ? <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-6 text-sm ml-1"
                            autoFocus onClick={e => e.stopPropagation()} onKeyDown={e => e.key === 'Enter' && saveSection(sec.id)} />
                        : <span className="ml-1">{sec.title}</span>}
                    </button>
                    <div className="flex gap-1 shrink-0">
                      {editingSectionId === sec.id ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveSection(sec.id)}><Check className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingSectionId(null)}><X className="h-3 w-3" /></Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingSectionId(sec.id); setEditValue(sec.title); }}><Pencil className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => deleteSection(sec.id)}><Trash2 className="h-3 w-3" /></Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  {expandedSections.has(sec.id) && (
                    <div className="p-2 space-y-2 bg-white">
                      {sec.items.map(item => (
                        <div key={item.id} className="border rounded-md overflow-hidden ml-4">
                          {/* Item row */}
                          <div className="flex items-center gap-2 bg-gray-50/70 px-3 py-1.5">
                            <button className="flex items-center gap-1 flex-1 text-left text-sm" onClick={() => toggleItem(item.id)}>
                              {expandedItems.has(item.id)
                                ? <ChevronDown className="h-3 w-3 shrink-0" />
                                : <ChevronRight className="h-3 w-3 shrink-0" />}
                              {editingItemId === item.id
                                ? <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-5 text-xs ml-1"
                                    autoFocus onClick={e => e.stopPropagation()} onKeyDown={e => e.key === 'Enter' && saveItem(sec.id, item.id)} />
                                : <span className="ml-1">{item.title}</span>}
                            </button>
                            <div className="flex gap-1 shrink-0">
                              {editingItemId === item.id ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => saveItem(sec.id, item.id)}><Check className="h-3 w-3" /></Button>
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingItemId(null)}><X className="h-3 w-3" /></Button>
                                </>
                              ) : (
                                <>
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { setEditingItemId(item.id); setEditValue(item.title); }}><Pencil className="h-3 w-3" /></Button>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 text-red-500" onClick={() => deleteItem(sec.id, item.id)}><Trash2 className="h-3 w-3" /></Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Tasks */}
                          {expandedItems.has(item.id) && (
                            <div className="p-2 ml-4 space-y-1">
                              {item.tasks.map(task => {
                                const hasSheet = !!infoSheets[task.id]?.info_sheet;
                                const isSelected = selectedTaskId === task.id;
                                return (
                                  <div key={task.id} className={`flex items-center gap-2 py-1 px-2 rounded text-sm group ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-50'}`}>
                                    <span className="flex-1">
                                      {editingTaskId === task.id
                                        ? <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-5 text-xs"
                                            autoFocus onKeyDown={e => e.key === 'Enter' && saveTask(sec.id, item.id, task.id)} />
                                        : task.title}
                                    </span>
                                    <div className="flex gap-1 shrink-0">
                                      {/* Bouton fiche — toujours visible */}
                                      {editingTaskId !== task.id && (
                                        <Button
                                          size="icon"
                                          variant={isSelected ? 'default' : 'ghost'}
                                          className={`h-5 w-5 ${hasSheet && !isSelected ? 'text-green-600 hover:text-green-700' : ''}`}
                                          title={hasSheet ? 'Modifier la fiche informative' : 'Définir la fiche informative'}
                                          onClick={() => isSelected ? closeInfoSheet() : openInfoSheet(task.id, task.title)}
                                        >
                                          <FileText className="h-3 w-3" />
                                        </Button>
                                      )}
                                      {/* Boutons édition — visibles au hover */}
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {editingTaskId === task.id ? (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => saveTask(sec.id, item.id, task.id)}><Check className="h-3 w-3" /></Button>
                                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingTaskId(null)}><X className="h-3 w-3" /></Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { setEditingTaskId(task.id); setEditValue(task.title); }}><Pencil className="h-3 w-3" /></Button>
                                            <Button size="icon" variant="ghost" className="h-5 w-5 text-red-500" onClick={() => { deleteTask(sec.id, item.id, task.id); if (selectedTaskId === task.id) closeInfoSheet(); }}><Trash2 className="h-3 w-3" /></Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Add task inline */}
                              {addingTaskToItem === item.id ? (
                                <div className="flex gap-2 mt-1">
                                  <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Nom de la tâche"
                                    className="h-7 text-xs" autoFocus onKeyDown={e => e.key === 'Enter' && addTask(sec.id, item.id)} />
                                  <Button size="sm" className="h-7 px-2 text-xs" onClick={() => addTask(sec.id, item.id)}>Ajouter</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setAddingTaskToItem(null); setNewTaskTitle(''); }}>Annuler</Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 pl-1" onClick={() => setAddingTaskToItem(item.id)}>
                                  <Plus className="h-3 w-3 mr-1" />Ajouter une tâche
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add item inline */}
                      {addingItemToSection === sec.id ? (
                        <div className="flex gap-2 ml-4 mt-1">
                          <Input value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Nom de la sous-étape"
                            className="h-7 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && addItem(sec.id)} />
                          <Button size="sm" className="h-7 px-2" onClick={() => addItem(sec.id)}>Ajouter</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setAddingItemToSection(null); setNewItemTitle(''); }}>Annuler</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="ml-4 text-muted-foreground" onClick={() => setAddingItemToSection(sec.id)}>
                          <Plus className="h-4 w-4 mr-1" />Ajouter une sous-étape
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add section */}
              {addingSection ? (
                <div className="flex gap-2 mt-2">
                  <Input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="Nom de l'étape"
                    autoFocus onKeyDown={e => e.key === 'Enter' && addSection()} />
                  <Button onClick={addSection}>Ajouter</Button>
                  <Button variant="ghost" onClick={() => { setAddingSection(false); setNewSectionTitle(''); }}>Annuler</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full mt-2" onClick={() => setAddingSection(true)}>
                  <Plus className="h-4 w-4 mr-2" />Ajouter une étape
                </Button>
              )}
            </div>

            {/* ── Panneau fiche informative ── */}
            {selectedTaskId && (
              <div className="border rounded-lg overflow-hidden flex flex-col">
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Fiche informative</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={closeInfoSheet}><X className="h-3 w-3" /></Button>
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="bg-white border rounded-md px-3 py-2 text-sm">
                    <p className="font-medium text-gray-800 truncate">{selectedTaskTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cette fiche s'affichera aux intervenants assignés.</p>
                  </div>
                  <Textarea
                    placeholder="Décrivez en détail ce qui est attendu pour cette tâche (objectifs, méthodologie, livrables...)"
                    value={infoSheetText}
                    onChange={e => setInfoSheetText(e.target.value)}
                    rows={12}
                    className="font-mono text-sm flex-1 resize-none"
                  />
                  <Button onClick={saveInfoSheet} disabled={savingSheet} className="w-full gap-2">
                    {savingSheet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer la fiche
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}
      </CardContent>
    </Card>
  );
};
