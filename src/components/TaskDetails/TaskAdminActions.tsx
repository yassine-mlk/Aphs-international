import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, RotateCcw, Users, History, ListChecks, ChevronUp, ChevronDown, X, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TaskAdminActionsProps {
  task: any;
  workflow: any;
  isAdmin: boolean;
  isSequential: boolean;
  participantNames: Record<string, string>;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
  setTask: React.Dispatch<React.SetStateAction<any>>;
  loadTaskDetails: () => Promise<void>;
  submitAdminDecision: (taskId: string, decision: string) => Promise<boolean>;
  handleAdminDecision: (decision: 'approved' | 'relaunch_partial' | 'relaunch_complete' | 'closed') => Promise<void>;
  isReassignModalOpen: boolean;
  setIsReassignModalOpen: (open: boolean) => void;
  reassignForm: any;
  setReassignForm: React.Dispatch<React.SetStateAction<any>>;
  allUsers: any[];
  setAllUsers: React.Dispatch<React.SetStateAction<any[]>>;
  reassignValidators: (taskId: string, executorId: string, validators: any[], maxRevisions: number, deadline: string, comment: string) => Promise<boolean>;
  user: any;
}

export const TaskAdminActions: React.FC<TaskAdminActionsProps> = ({
  task,
  workflow,
  isAdmin,
  isSequential,
  participantNames,
  submitting,
  setSubmitting,
  setTask,
  loadTaskDetails,
  submitAdminDecision,
  handleAdminDecision,
  isReassignModalOpen,
  setIsReassignModalOpen,
  reassignForm,
  setReassignForm,
  allUsers,
  setAllUsers,
  reassignValidators,
  user
}) => {
  if (!isAdmin || !task) return null;

  // Cas pour Workflow Séquentiel
  if (isSequential) {
    const isBlocked = (task.status as string) === 'blocked' || (task.revision_count >= task.max_revisions);
    const isFinished = ['vso', 'vao'].includes(task.status);
    
    // BUG 3: La condition d'affichage doit exclure les tâches déjà clôturées
    const showAdminDecision = (isBlocked || isFinished) && !task.closed_at;

    if (showAdminDecision) {
      return (
        <>
          <Card className={`border-2 shadow-xl ${isBlocked ? 'border-red-200 bg-red-50/10' : 'border-green-200 bg-green-50/10'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg font-black">
                {isBlocked ? (
                  <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
                ) : (
                  <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
                )}
                {isBlocked ? "CIRCUIT BLOQUÉ" : "CIRCUIT TERMINÉ"}
              </CardTitle>
              <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {isBlocked 
                  ? `${task.revision_count} révisions effectuées sans visa favorable.`
                  : `Le circuit a abouti au visa final : ${task.status.toUpperCase()}.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                {/* Action 1: Clôturer / Valider quand même (BUG 1: avec confirmation et logs) */}
                <Button 
                  className={`w-full h-12 font-black text-xs uppercase tracking-widest shadow-md ${isBlocked ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                  onClick={async () => {
                    console.log('Force close triggered for task:', task.id);
                    if (window.confirm("Êtes-vous sûr ? Cette action est irréversible.")) {
                      setSubmitting(true);
                      const success = await submitAdminDecision(task.id, 'closed');
                      if (success) {
                        // BUG 2: Mettre à jour le state local immédiatement
                        setTask((prev: any) => prev ? ({ 
                          ...prev, 
                          status: 'closed', 
                          closed_at: new Date().toISOString(),
                          closed_by: user?.id
                        }) : null);
                        loadTaskDetails();
                      }
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                >
                  {isBlocked ? "Valider quand même" : "Clôturer la tâche"}
                </Button>

                {/* Action 2: Relancer le circuit (BUG 2: reset revision_count) */}
                <Button 
                  variant="outline"
                  className="w-full h-12 font-black text-xs uppercase tracking-widest border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={async () => {
                    console.log('Relaunch circuit triggered for task:', task.id);
                    setSubmitting(true);
                    const success = await submitAdminDecision(task.id, 'relaunch_complete');
                    if (success) {
                      // BUG 2: Mettre à jour le state local immédiatement
                      setTask((prev: any) => prev ? ({ 
                        ...prev, 
                        status: 'open', 
                        revision_count: 0 
                      }) : null);
                      // BUG 4: Reset local des soumissions
                      loadTaskDetails();
                    }
                    setSubmitting(false);
                  }}
                  disabled={submitting}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Relancer le circuit
                </Button>

                {/* Action 3: Réassigner les validateurs */}
                <Button 
                  variant="outline"
                  className="w-full h-12 font-black text-xs uppercase tracking-widest border-purple-200 text-purple-700 hover:bg-purple-50"
                  onClick={async () => {
                    // Charger les utilisateurs pour le sélecteur
                    const { data: profiles } = await supabase
                      .from('profiles')
                      .select('user_id, first_name, last_name, role');
                    if (profiles) setAllUsers(profiles);
                    
                    // Initialiser le formulaire avec les données actuelles
                    setReassignForm({
                      executor_id: task.assigned_to[0] || '',
                      validators: task.validators.map((v: any) => ({ user_id: v.user_id, days_limit: v.days_limit || 5 })),
                      max_revisions: task.max_revisions,
                      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
                      comment: ''
                    });
                    setIsReassignModalOpen(true);
                  }}
                  disabled={submitting}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Réassigner
                </Button>
              </div>
              
              <div className="p-3 bg-white/50 rounded-lg border border-gray-100">
                <p className="text-[10px] text-gray-500 italic text-center leading-tight">
                  {isBlocked 
                    ? "La limite de révisions est atteinte. Vous devez décider de clôturer le dossier en l'état ou de relancer un nouveau cycle." 
                    : "Le circuit est terminé. Vous pouvez maintenant clôturer définitivement la tâche pour l'archiver."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Modal de Réassignation des Validateurs */}
          <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <RotateCcw className="h-6 w-6 text-purple-600" />
                  Réassigner le workflow
                </DialogTitle>
                <DialogDescription className="font-medium">
                  Modifiez tous les paramètres du circuit pour relancer la tâche.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-8">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed font-bold">
                    La réassignation réinitialisera complètement le circuit et le compteur de révisions (0 / {reassignForm.max_revisions}).
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 1. EXÉCUTANT */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">1. Exécutant (rédacteur)</Label>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <select 
                        className="w-full bg-transparent text-sm font-bold focus:outline-none"
                        value={reassignForm.executor_id}
                        onChange={(e) => setReassignForm((prev: any) => ({ ...prev, executor_id: e.target.value }))}
                      >
                        <option value="">Sélectionner un exécutant</option>
                        {allUsers.map(u => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.first_name} {u.last_name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 3. DATE LIMITE */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">2. Date limite finale</Label>
                    <Input 
                      type="date"
                      className="font-bold h-11 rounded-xl"
                      value={reassignForm.deadline}
                      onChange={(e) => setReassignForm((prev: any) => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>

                  {/* 4. MAX RÉVISIONS */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">3. Nombre de tours max</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="number"
                        min="1"
                        max="10"
                        className="w-24 font-bold h-11 rounded-xl text-center"
                        value={reassignForm.max_revisions}
                        onChange={(e) => setReassignForm((prev: any) => ({ ...prev, max_revisions: parseInt(e.target.value) || 1 }))}
                      />
                      <p className="text-[10px] text-gray-400 italic">
                        Limite avant blocage du circuit
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. VALIDATEURS */}
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">4. Circuit des validateurs (ordre séquentiel)</Label>
                  
                  <div className="space-y-2 border-2 border-dashed border-gray-100 p-4 rounded-2xl">
                    {reassignForm.validators.map((v: any, idx: number) => (
                      <div key={v.user_id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm group">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm font-bold text-gray-700">{participantNames[v.user_id] || "Utilisateur"}</span>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === 0}
                            onClick={() => {
                              const newList = [...reassignForm.validators];
                              [newList[idx], newList[idx-1]] = [newList[idx-1], newList[idx]];
                              setReassignForm((prev: any) => ({ ...prev, validators: newList }));
                            }}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === reassignForm.validators.length - 1}
                            onClick={() => {
                              const newList = [...reassignForm.validators];
                              [newList[idx], newList[idx+1]] = [newList[idx+1], newList[idx]];
                              setReassignForm((prev: any) => ({ ...prev, validators: newList }));
                            }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setReassignForm((prev: any) => ({
                                ...prev,
                                validators: prev.validators.filter((val: any) => val.user_id !== v.user_id)
                              }));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {reassignForm.validators.length === 0 && (
                      <p className="text-center py-6 text-xs text-gray-400 italic">Aucun validateur sélectionné.</p>
                    )}

                    <div className="pt-2">
                      <select 
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-blue-600 focus:outline-none cursor-pointer"
                        onChange={(e) => {
                          const userId = e.target.value;
                          if (userId && !reassignForm.validators.some((v: any) => v.user_id === userId)) {
                            setReassignForm((prev: any) => ({
                              ...prev,
                              validators: [...prev.validators, { user_id: userId, days_limit: 5 }]
                            }));
                          }
                          e.target.value = "";
                        }}
                      >
                        <option value="">+ Ajouter un validateur...</option>
                        {allUsers
                          .filter(u => !reassignForm.validators.some((v: any) => v.user_id === u.user_id) && u.user_id !== reassignForm.executor_id)
                          .map(u => (
                            <option key={u.user_id} value={u.user_id}>
                              {u.first_name} {u.last_name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. INSTRUCTIONS */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">5. Instructions pour la nouvelle révision</Label>
                  <Textarea 
                    placeholder="Ex: Merci de prendre en compte les remarques de l'indice précédent..."
                    className="min-h-[100px] rounded-2xl resize-none font-medium text-sm"
                    value={reassignForm.comment}
                    onChange={(e) => setReassignForm((prev: any) => ({ ...prev, comment: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-6 border-t">
                <Button variant="ghost" onClick={() => setIsReassignModalOpen(false)} className="font-bold text-xs uppercase tracking-widest">
                  Annuler
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 font-black text-xs uppercase tracking-widest px-8 h-12 shadow-lg shadow-purple-100"
                  disabled={!reassignForm.executor_id || reassignForm.validators.length === 0 || !reassignForm.deadline || submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    const success = await reassignValidators(
                      task.id, 
                      reassignForm.executor_id,
                      reassignForm.validators, 
                      reassignForm.max_revisions,
                      reassignForm.deadline,
                      reassignForm.comment
                    );
                    if (success) {
                      // BUG 2: Mettre à jour le state local immédiatement
                      setTask((prev: any) => prev ? ({ 
                        ...prev, 
                        status: 'open', 
                        revision_count: 0,
                        deadline: reassignForm.deadline,
                        max_revisions: reassignForm.max_revisions
                      }) : null);
                      // BUG 4: Reset local
                      setIsReassignModalOpen(false);
                      loadTaskDetails();
                    }
                    setSubmitting(false);
                  }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer la réassignation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    // BUG 1: Afficher un badge vert fixe si clôturé
    if (task.closed_at) {
      return (
        <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-black text-sm uppercase tracking-wider">Tâche clôturée</p>
            <p className="text-xs font-medium">
              Par {participantNames[task.closed_by || ''] || 'l\'administrateur'} le {new Date(task.closed_at).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  // Cas pour Standard
  const isTaskClosed = ['approved', 'closed'].includes(task.status);
  const latestSub = workflow?.submissions?.[0];
  const allValidatorsResponded = task.validators?.length > 0 && latestSub?.reviews?.length >= task.validators.length;

  if (!isTaskClosed && allValidatorsResponded) {
    return (
      <Card className="border-purple-200 bg-purple-50/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
            <ListChecks className="h-5 w-5" />
            Décisions Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <Button 
              variant="outline" 
              className="justify-start border-green-200 hover:bg-green-50 text-green-700"
              onClick={() => handleAdminDecision('approved')}
              disabled={submitting}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approuver
            </Button>
            <Button 
              variant="outline" 
              className="justify-start border-blue-200 hover:bg-blue-50 text-blue-700"
              onClick={() => handleAdminDecision('relaunch_partial')}
              disabled={submitting}
            >
              <History className="h-4 w-4 mr-2" />
              Relancer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  return null;
};
