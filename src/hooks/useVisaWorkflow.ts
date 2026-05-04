import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from '@/components/ui/use-toast';
import {
  VisaWorkflowFull,
  CreateVisaValidationData,
  CreateVisaSubmissionData,
  VisaValidationResult
} from '@/types/visaWorkflow';
import { 
  notifyWorkflowSubmission, 
  notifyValidatorTurn, 
  notifyVisaResult, 
  notifyWorkflowBlocked,
  notifyAdminTaskAction 
} from '@/lib/notifications/workflowNotifications';
import { 
  notifyStandardTaskSubmission, 
  notifyValidatorReview, 
  notifyStandardTaskDecision,
  notifyStandardTaskRelaunch
} from '@/lib/notifications/standardTaskNotifications';

export const useVisaWorkflow = () => {
  const { toast } = useToast();
  const { status, user } = useAuth();
  const { supabase } = useSupabase();

  // Récupérer le workflow complet pour une tâche
  const fetchWorkflow = useCallback(async (taskId: string): Promise<VisaWorkflowFull | null> => {
    if (status !== 'authenticated') return null;
    try {
      // 1. Récupérer la tâche via la vue consolidée
      const { data: task, error: taskError } = await supabase
        .from('task_assignments_view')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (taskError || !task) return null;

      const isStandard = task.assignment_type === 'standard';
      const submissionTable = isStandard ? 'standard_task_submissions' : 'workflow_task_submissions';
      const reviewTable = isStandard ? 'standard_task_reviews' : 'workflow_task_reviews';

      // 2. Récupérer toutes les soumissions et leurs reviews (BUG 4: filtrer les archivés pour les workflows)
      let query = supabase
        .from(submissionTable)
        .select(`
          *,
          reviews:${reviewTable}(*)
        `)
        .eq('task_id', taskId);
      
      if (!isStandard) {
        query = query.eq('is_archived', false);
      }
      
      const { data: submissions, error: subError } = await query
        .order('submitted_at', { ascending: false });

      if (subError) throw subError;

      // 3. Récupérer l'historique
      const { data: history, error: historyError } = await supabase
        .from('task_history')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (historyError) console.warn('History fetch error:', historyError);

      // 4. Collecter tous les IDs utilisateurs pour les profils
      const allUserIds = new Set<string>();
      task.assigned_to.forEach((id: string) => allUserIds.add(id));
      task.validators.forEach((v: any) => allUserIds.add(v.user_id));
      submissions?.forEach((s: any) => {
        allUserIds.add(s.executor_id);
        s.reviews?.forEach((r: any) => allUserIds.add(r.validator_id));
      });

      // 4. Récupérer les profils
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', Array.from(allUserIds));

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      const getUserName = (userId: string) => {
        const profile = profileMap.get(userId) as any;
        return profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Inconnu';
      };

      // 5. Identifier le validateur actuel (si c'est un workflow)
      let currentValidatorId = undefined;
      let currentValidatorName = undefined;
      let currentValidatorIdx = undefined;

      const latestSubmission = submissions?.[0];
      const validatorOrder = task.validators
        .sort((a: any, b: any) => a.validator_order - b.validator_order)
        .map((v: any) => v.user_id);
      
      if (task.assignment_type === 'workflow' && latestSubmission && task.status === 'in_review') {
        const reviews = latestSubmission.reviews || [];
        const reviewedIds = new Set(reviews.map((r: any) => r.validator_id));
        
        // Le premier validateur qui n'a pas encore review
        const nextValidatorIdx = task.validators
          .sort((a: any, b: any) => a.validator_order - b.validator_order)
          .findIndex((v: any) => !reviewedIds.has(v.user_id));
          
        if (nextValidatorIdx !== -1) {
          const nextValidator = task.validators.sort((a: any, b: any) => a.validator_order - b.validator_order)[nextValidatorIdx];
          currentValidatorId = nextValidator.user_id;
          currentValidatorName = getUserName(currentValidatorId);
          currentValidatorIdx = nextValidatorIdx;
        }
      }

      // 6. Récupérer le résumé de validation (pour l'admin)
      let validationSummary = undefined;
      if (task.assignment_type === 'standard') {
        const { data: summary } = await supabase.rpc('get_task_validation_status', { p_task_id: taskId });
        validationSummary = summary;
      }

      const allNames: Record<string, string> = {};
      allUserIds.forEach(id => {
        allNames[id] = getUserName(id);
      });

      return {
        id: task.id,
        task_name: task.task_name,
        project_id: task.project_id,
        project_name: task.project_name,
        tenant_id: task.tenant_id,
        status: task.status,
        task_type: task.assignment_type,
        executor_ids: task.assigned_to,
        validators: task.validators.map((v: any) => ({
          ...v,
          name: getUserName(v.user_id)
        })),
        submissions: submissions?.map((s: any) => ({
          ...s,
          executor_name: getUserName(s.executor_id),
          reviews: s.reviews?.map((r: any) => ({
            ...r,
            validator_name: getUserName(r.validator_id)
          }))
        })) || [],
        current_submission: latestSubmission,
        current_validator_id: currentValidatorId,
        current_validator_name: currentValidatorName,
        current_validator_idx: task.current_validator_idx || 0,
        current_version: latestSubmission?.version || 0,
        current_version_label: task.current_version_label || 'A',
        validator_order: validatorOrder,
        all_names: allNames,
        validation_summary: validationSummary,
        history: history || [],
        created_at: task.created_at || new Date().toISOString()
      };
    } catch (error) {
      console.error('fetchWorkflow error:', error);
      return null;
    }
  }, [status, supabase]);

  // Soumettre un fichier (par l'exécutant)
  const submitDocument = useCallback(async (
    taskId: string,
    data: CreateVisaSubmissionData,
    executorId: string
  ): Promise<boolean> => {
    if (status !== 'authenticated') return false;
    try {
      // 1. Récupérer le type de tâche pour savoir où insérer
      const { data: task } = await supabase
        .from('task_assignments_view')
        .select('assignment_type, tenant_id, current_version_label')
        .eq('id', taskId)
        .single();

      if (!task) throw new Error('Tâche non trouvée');

      const isStandard = task.assignment_type === 'standard';
      const submissionTable = isStandard ? 'standard_task_submissions' : 'workflow_task_submissions';

      // 2. Créer la soumission (les triggers s'occupent du reste pour les workflows)
      const submissionData: any = {
        task_id: taskId,
        executor_id: executorId,
        file_url: data.file_url,
        file_name: data.file_name,
        comment: data.comment,
        tenant_id: task.tenant_id
      };

      const { data: newSubmission, error: submissionError } = await supabase
        .from(submissionTable)
        .insert(submissionData)
        .select('id')
        .single();

      if (submissionError) throw submissionError;

      // 2.5 Notifier les validateurs et l'admin
      if (!isStandard) {
        const versionLabel = task.current_version_label || 'A';
        notifyWorkflowSubmission(taskId, executorId, versionLabel);
        
        // Notifier le premier validateur que c'est son tour
        const { data: firstValidator } = await supabase
          .from('workflow_task_assignments')
          .select('user_id, days_limit')
          .eq('task_id', taskId)
          .eq('role', 'validator')
          .order('validator_order', { ascending: true })
          .limit(1)
          .single();
        
        if (firstValidator) {
          notifyValidatorTurn(taskId, firstValidator.user_id, versionLabel);
        }
      } else {
        // Pour les tâches STANDARD
        if (newSubmission) {
          await notifyStandardTaskSubmission(taskId, executorId, newSubmission.id);
        }
      }

      // 3. Mettre à jour la tâche seulement pour les tâches standard
      // Pour les workflows, le trigger s'en occupe
      if (isStandard) {
        const { error: updateError } = await supabase
          .from('standard_tasks')
          .update({
            status: 'in_review',
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Document soumis',
        description: 'Document soumis pour validation'
      });

      return true;
    } catch (error) {
      console.error('submitDocument error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre le document',
        variant: 'destructive'
      });
      return false;
    }
  }, [status, supabase, toast]);

  // Donner un avis (par un validateur)
  const submitValidation = useCallback(async (
    taskId: string,
    data: CreateVisaValidationData,
    validatorId: string,
    submissionId?: string
  ): Promise<VisaValidationResult> => {
    if (status !== 'authenticated') {
      return { success: false, nextStatus: 'pending_validation' as any, nextValidatorIdx: 0, allValidated: false, message: 'Non authentifié' };
    }
    try {
      // 1. Récupérer le workflow complet pour vérifier les conditions
      const workflow = await fetchWorkflow(taskId);
      if (!workflow) {
        return { success: false, nextStatus: undefined as any, nextValidatorIdx: 0, allValidated: false, message: 'Données non trouvées' };
      }

      const targetSubmissionId = submissionId || workflow.current_submission?.id;
      if (!targetSubmissionId) {
        return { success: false, nextStatus: undefined as any, nextValidatorIdx: 0, allValidated: false, message: 'Aucune soumission trouvée' };
      }

      // 2. Vérifier que c'est bien le tour de ce validateur (uniquement pour le type workflow)
      if (workflow.task_type === 'workflow' && workflow.current_validator_id !== validatorId) {
        return { success: false, nextStatus: workflow.status as any, nextValidatorIdx: 0, allValidated: false, message: 'Ce n\'est pas votre tour de valider' };
      }

      const isStandard = workflow.task_type === 'standard';
      const reviewTable = isStandard ? 'standard_task_reviews' : 'workflow_task_reviews';

      // 3. Créer la review (les triggers s'occupent du reste pour les workflows)
      const { data: newReview, error: reviewError } = await supabase
        .from(reviewTable)
        .insert({
          submission_id: targetSubmissionId,
          validator_id: validatorId,
          opinion: data.opinion,
          comment: data.comment,
          tenant_id: workflow.tenant_id
        })
        .select('id')
        .single();

      if (reviewError) throw reviewError;

      // 3.5 Gérer les notifications
      if (!isStandard) {
        // On récupère le workflow à jour pour voir si c'est le tour de quelqu'un d'autre ou si c'est fini
        const updatedWorkflow = await fetchWorkflow(taskId);
        if (updatedWorkflow) {
          if (updatedWorkflow.status === 'in_review' && updatedWorkflow.current_validator_id) {
            // C'est le tour du suivant
            notifyValidatorTurn(taskId, updatedWorkflow.current_validator_id, updatedWorkflow.current_version_label || 'A');
          } else if (['approved', 'vso', 'vao', 'var', 'rejected'].includes(updatedWorkflow.status)) {
            // C'est fini (Visa final obtenu)
            const visa = updatedWorkflow.status === 'approved' ? 'vso' : updatedWorkflow.status;
            notifyVisaResult(
              taskId, 
              visa, 
              updatedWorkflow.executor_ids[0], 
              updatedWorkflow.current_version_label || 'A'
            );

            // Vérifier si c'est bloqué (si status est rejected ou var et qu'on a atteint max)
            const { data: taskInfo } = await supabase.from('workflow_tasks').select('revision_count, max_revisions').eq('id', taskId).single();
            if (taskInfo && taskInfo.revision_count >= taskInfo.max_revisions && ['var', 'rejected'].includes(updatedWorkflow.status)) {
              notifyWorkflowBlocked(taskId, updatedWorkflow.executor_ids[0], taskInfo.revision_count, taskInfo.max_revisions);
            }
          }
        }
      } else {
        // Pour les tâches STANDARD
        if (newReview) {
          await notifyValidatorReview(taskId, validatorId, newReview.id, data.opinion);
        }
      }

      // 4. Mettre à jour la tâche seulement pour les tâches standard
      // Pour les workflows, le trigger s'en occupe (incrément, visa final, etc.)
      if (isStandard) {
        let nextStatus = workflow.status;
        if (data.opinion === 'D') {
          nextStatus = 'in_review'; // On reste en review pour standard
        }
        
        if (nextStatus !== workflow.status) {
          const { error: updateError } = await supabase
            .from('standard_tasks')
            .update({
              status: nextStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', taskId);
          
          if (updateError) throw updateError;
        }
      }

      toast({
        title: 'Avis enregistré',
        description: 'Votre avis a été pris en compte'
      });

      return { success: true, nextStatus: workflow.status as any, nextValidatorIdx: 0, allValidated: false, message: 'Succès' };
    } catch (error) {
      console.error('submitValidation error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer l\'avis',
        variant: 'destructive'
      });
      return { success: false, nextStatus: 'pending_validation' as any, nextValidatorIdx: 0, allValidated: false, message: 'Erreur technique' };
    }
  }, [status, supabase, toast, fetchWorkflow]);

  // Decision finale de l'admin
  const submitAdminDecision = useCallback(async (
    taskId: string,
    decision: 'approved' | 'rejected' | 'closed' | 'relaunch_partial' | 'relaunch_complete'
  ): Promise<boolean> => {
    if (status !== 'authenticated' || !user?.id) return false;
    try {
      const { data: taskData } = await supabase.from('task_assignments_view').select('assignment_type, status, task_name').eq('id', taskId).single();
      if (!taskData) throw new Error('Tâche non trouvée');

      const isStandard = taskData.assignment_type === 'standard';
      const taskType = isStandard ? 'standard' : 'workflow';
      let oldStatus = taskData.status;
      let newStatus = '';

      if (decision === 'relaunch_complete') {
        newStatus = 'open';
        // BUG 4: Archiver les anciennes révisions et avis
        await supabase.rpc('archive_task_reviews', { p_task_id: taskId });

        if (isStandard) {
          await supabase.from('standard_task_submissions').delete().eq('task_id', taskId);
          await supabase.from('standard_tasks').update({ 
            status: 'open', 
            updated_at: new Date().toISOString() 
          }).eq('id', taskId);
        } else {
          // On ne supprime plus workflow_task_submissions car on utilise is_archived
          await supabase.from('workflow_tasks').update({ 
            status: 'open', 
            current_validator_idx: 0, 
            current_version: 1, 
            revision_count: 0, // RESET OBLIGATOIRE (BUG 2)
            updated_at: new Date().toISOString() 
          }).eq('id', taskId);
        }
      } 
      else if (decision === 'relaunch_partial') {
        if (isStandard) {
          const { data: summary } = await supabase.rpc('get_task_validation_status', { p_task_id: taskId });
          newStatus = (summary?.submitted_executors > 0) ? 'in_review' : 'open';
          await supabase.from('standard_tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', taskId);
        } else {
          newStatus = 'var';
          await supabase.from('workflow_tasks').update({ status: 'var', updated_at: new Date().toISOString() }).eq('id', taskId);
        }
      } 
      else if (decision === 'closed') {
        const taskTable = isStandard ? 'standard_tasks' : 'workflow_tasks';
        newStatus = 'closed';
        await supabase.from(taskTable).update({ 
          status: newStatus, 
          closed_by: user.id,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        }).eq('id', taskId);
      }
      else {
        const taskTable = isStandard ? 'standard_tasks' : 'workflow_tasks';
        newStatus = decision === 'approved' ? (isStandard ? 'approved' : 'vso') : (decision === 'rejected' && !isStandard ? 'var' : decision);
        await supabase.from(taskTable).update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', taskId);
      }

      // Log manuel dans l'historique pour tracer l'admin
      let actionLog = 'admin_decision';
      let detailsLog: any = { decision, task_name: taskData.task_name };

      if (decision === 'relaunch_complete') {
        actionLog = 'relaunch';
        detailsLog.message = "Circuit relancé par l'admin — compteur réinitialisé";
      } else if (decision === 'closed') {
        actionLog = 'closure';
        detailsLog.message = `Clôture forcée par ${user.id}`;
      }

      await supabase.from('task_history').insert({
        task_id: taskId,
        task_type: taskType,
        user_id: user.id,
        action: actionLog,
        old_status: oldStatus,
        new_status: newStatus,
        details: detailsLog
      });

      // 5. Notifier les intervenants de la décision admin
      const participantTable = isStandard ? 'standard_task_assignments' : 'workflow_task_assignments';
      const { data: assignments } = await supabase
        .from(participantTable)
        .select('user_id, role')
        .eq('task_id', taskId);
      
      if (assignments && assignments.length > 0) {
        if (!isStandard) {
          const executors = assignments.filter(a => a.role === 'executor');
          const actionMap: Record<string, 'closed' | 'relaunch' | 'reassignment'> = {
            'closed': 'closed',
            'relaunch_complete': 'relaunch',
            'relaunch_partial': 'relaunch',
          };
          const action = actionMap[decision] || 'relaunch';
          for (const a of executors) {
            await notifyAdminTaskAction(taskId, a.user_id, action);
          }
        } else {
          // Pour les tâches STANDARD
          const participantIds = assignments.map(a => a.user_id);
          const executorIds = assignments.filter(a => a.role === 'executor').map(a => a.user_id);
          const validatorIds = assignments.filter(a => a.role === 'validator').map(a => a.user_id);
          
          if (decision === 'approved' || decision === 'closed') {
            // Vérifier s'il y avait un avis défavorable
            const workflow = await fetchWorkflow(taskId);
            const hasNegativeReview = workflow?.submissions?.some(s => 
              s.reviews?.some(r => r.opinion === 'D')
            ) || false;
            
            await notifyStandardTaskDecision(taskId, decision as any, participantIds, hasNegativeReview);
          } else if (decision === 'relaunch_partial') {
            // Trouver les executors qui ont eu un avis défavorable
            const workflow = await fetchWorkflow(taskId);
            const relancedIds = workflow?.submissions
              ?.filter(s => s.reviews?.some(r => r.opinion === 'D'))
              ?.map(s => s.executor_id) || [];
            
            if (relancedIds.length > 0) {
              await notifyStandardTaskRelaunch(taskId, Array.from(new Set(relancedIds)), validatorIds);
            }
          } else if (decision === 'relaunch_complete') {
            await notifyStandardTaskRelaunch(taskId, executorIds, validatorIds);
          }
        }
      }

      toast({ title: 'Décision enregistrée', description: 'La tâche a été mise à jour.' });
      return true;
    } catch (error) {
      console.error('submitAdminDecision error:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer la décision', variant: 'destructive' });
      return false;
    }
  }, [status, user, supabase, toast]);

  // Réassigner les validateurs d'une tâche
  const reassignValidators = useCallback(async (
    taskId: string,
    newExecutorId: string,
    newValidators: { user_id: string; days_limit: number }[],
    newMaxRevisions: number,
    newDeadline: string,
    instructions?: string
  ): Promise<boolean> => {
    if (status !== 'authenticated' || !user?.id) return false;
    try {
      // 1. Récupérer les infos de la tâche
      const { data: taskData } = await supabase
        .from('workflow_tasks')
        .select('id, title, project_id, tenant_id')
        .eq('id', taskId)
        .maybeSingle();
      
      if (!taskData) throw new Error('Tâche non trouvée');

      // BUG 4: Archiver les anciennes révisions et avis
      await supabase.rpc('archive_task_reviews', { p_task_id: taskId });

      // 2. Mettre à jour la tâche (reset revision_count et status)
      await supabase
        .from('workflow_tasks')
        .update({
          status: 'open',
          revision_count: 0,
          max_revisions: newMaxRevisions,
          deadline: newDeadline,
          current_validator_idx: 0,
          updated_at: new Date().toISOString(),
          description: instructions || null
        })
        .eq('id', taskId);

      // 3. Supprimer TOUTES les anciennes assignations
      await supabase
        .from('workflow_task_assignments')
        .delete()
        .eq('task_id', taskId);

      // 4. Réinsérer l'exécuteur
      await supabase
        .from('workflow_task_assignments')
        .insert({
          task_id: taskId,
          user_id: newExecutorId,
          role: 'executor',
          days_limit: 3 // Défaut
        });

      // 5. Insérer les nouveaux validateurs avec le bon ordre
      const validatorInserts = newValidators.map((v, idx) => ({
        task_id: taskId,
        user_id: v.user_id,
        role: 'validator',
        validator_order: idx + 1,
        days_limit: v.days_limit
      }));

      if (validatorInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('workflow_task_assignments')
          .insert(validatorInserts);
        if (insertError) throw insertError;
      }

      // 6. Notifier l'exécuteur et les nouveaux validateurs
      await notifyAdminTaskAction(taskId, newExecutorId, 'reassignment');
      for (const v of newValidators) {
        await notifyValidatorTurn(taskId, v.user_id, 'A');
      }

      // 7. Log historique
      await supabase.from('task_history').insert({
        task_id: taskId,
        task_type: 'workflow',
        user_id: user.id,
        action: 'reassignment',
        old_status: 'blocked',
        new_status: 'open',
        details: { 
          message: `Workflow réassigné par l'admin. Compteur réinitialisé. Nouveau délai : ${newDeadline}. Nouveaux tours : ${newMaxRevisions}.`,
          new_deadline: newDeadline,
          new_max_revisions: newMaxRevisions,
          executor_id: newExecutorId,
          validators_count: newValidators.length
        }
      });

      toast({ title: 'Réassignation réussie', description: 'Le circuit a été réinitialisé.' });
      return true;
    } catch (error) {
      console.error('reassignValidators error:', error);
      toast({ title: 'Erreur', description: 'Impossible de réassigner les validateurs', variant: 'destructive' });
      return false;
    }
  }, [status, user, supabase, toast]);

  return {
    fetchWorkflow,
    submitDocument,
    submitValidation,
    submitAdminDecision,
    reassignValidators
  };
};
