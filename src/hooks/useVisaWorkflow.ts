import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { notifyWorkflowStatusChange } from '@/lib/notifications';
import {
  VisaWorkflow,
  VisaWorkflowFull,
  VisaValidation,
  VisaSubmission,
  VisaHistory,
  VisaOpinion,
  VisaWorkflowStatus,
  CreateVisaValidationData,
  CreateVisaSubmissionData,
  VisaValidationResult
} from '@/types/visaWorkflow';

export const useVisaWorkflow = () => {
  const { toast } = useToast();

  // Récupérer le workflow complet pour une assignation
  const fetchWorkflow = useCallback(async (taskAssignmentId: string): Promise<VisaWorkflowFull | null> => {
    try {
      // 1. Récupérer le workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('task_visa_workflows')
        .select('*')
        .eq('task_assignment_id', taskAssignmentId)
        .maybeSingle();

      if (workflowError || !workflow) return null;

      // 2. Récupérer toutes les validations (sans jointure à cause du type TEXT vs UUID)
      const { data: validations } = await supabase
        .from('task_visa_validations')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('version', { ascending: true })
        .order('created_at', { ascending: true });

      // 3. Récupérer toutes les soumissions
      const { data: submissions } = await supabase
        .from('task_visa_submissions')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('version', { ascending: true });

      // 4. Récupérer l'historique
      const { data: history } = await supabase
        .from('task_visa_history')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('created_at', { ascending: true });

      // 5. Collecter tous les IDs utilisateurs pour les rechercher
      const allUserIds = new Set<string>();
      workflow.validator_order.forEach(id => allUserIds.add(id));
      if (workflow.executor_id) allUserIds.add(workflow.executor_id);
      validations?.forEach((v: any) => allUserIds.add(v.validator_id));
      submissions?.forEach((s: any) => allUserIds.add(s.executor_id));
      history?.forEach((h: any) => allUserIds.add(h.actor_id));

      // 6. Récupérer les profils
      const { data: validatorProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', Array.from(allUserIds));

      const profileMap = new Map(validatorProfiles?.map((p: any) => [p.user_id, p]) || []);

      const currentValidatorId = workflow.validator_order[workflow.current_validator_idx];
      const currentValidator = profileMap.get(currentValidatorId) as any;
      const executor = profileMap.get(workflow.executor_id) as any;

      // Build validator names map
      const validatorNames: Record<string, string> = {};
      profileMap.forEach((profile: any, userId: string) => {
        validatorNames[userId] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Inconnu';
      });

      // Helper pour obtenir le nom d'un utilisateur
      const getUserName = (userId: string) => {
        const profile = profileMap.get(userId) as { first_name?: string; last_name?: string } | undefined;
        return profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Inconnu';
      };

      return {
        ...workflow,
        validations: validations?.map((v: any) => ({
          ...v,
          validator_name: getUserName(v.validator_id)
        })) || [],
        submissions: submissions?.map((s: any) => ({
          ...s,
          executor_name: getUserName(s.executor_id)
        })) || [],
        history: history?.map((h: any) => ({
          ...h,
          actor_name: getUserName(h.actor_id)
        })) || [],
        current_validator_name: currentValidator ? 
          `${currentValidator.first_name || ''} ${currentValidator.last_name || ''}`.trim() : 'Inconnu',
        executor_name: executor ? 
          `${executor.first_name || ''} ${executor.last_name || ''}`.trim() : 'Inconnu',
        validator_names: validatorNames
      };
    } catch (error) {
      console.error('Erreur fetchWorkflow:', error);
      return null;
    }
  }, []);

  // Soumettre un fichier (par l'exécutant)
  const submitDocument = useCallback(async (
    workflowId: string,
    data: CreateVisaSubmissionData,
    executorId: string
  ): Promise<boolean> => {
    try {
      // 1. Récupérer le workflow pour connaître la version
      const { data: workflow } = await supabase
        .from('task_visa_workflows')
        .select('current_version, status')
        .eq('id', workflowId)
        .single();

      if (!workflow) return false;

      const newVersion = workflow.current_version + 1;

      // 2. Créer la soumission
      const { error: submissionError } = await supabase
        .from('task_visa_submissions')
        .insert({
          workflow_id: workflowId,
          version: newVersion,
          executor_id: executorId,
          file_url: data.file_url,
          file_name: data.file_name,
          comment: data.comment
        });

      if (submissionError) throw submissionError;

      // 3. Mettre à jour le workflow
      const isResubmission = workflow.status === 'revision_required' || workflow.status === 'suspended';
      
      const { error: updateError } = await supabase
        .from('task_visa_workflows')
        .update({
          current_version: newVersion,
          status: 'pending_validation',
          current_validator_idx: 0, // Reprendre depuis le premier validateur
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId);

      if (updateError) throw updateError;

      // 4. Ajouter à l'historique
      await supabase.from('task_visa_history').insert({
        workflow_id: workflowId,
        version: newVersion,
        action: isResubmission ? 'resubmitted' : 'submitted',
        actor_id: executorId,
        actor_role: 'executor',
        comment: data.comment
      });

      toast({
        title: 'Document soumis',
        description: isResubmission ? 
          'Document resoumis pour validation' : 
          'Document soumis pour validation'
      });

      return true;
    } catch (error) {
      console.error('Erreur submitDocument:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre le document',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Donner un avis (par un validateur)
  const submitValidation = useCallback(async (
    workflowId: string,
    data: CreateVisaValidationData,
    validatorId: string
  ): Promise<VisaValidationResult> => {
    try {
      // 1. Récupérer le workflow
      const { data: workflow } = await supabase
        .from('task_visa_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (!workflow) {
        return { success: false, nextStatus: workflow?.status, nextValidatorIdx: 0, allValidated: false, message: 'Workflow non trouvé' };
      }

      // 2. Vérifier que c'est bien le tour de ce validateur
      const currentValidatorId = workflow.validator_order[workflow.current_validator_idx];
      if (currentValidatorId !== validatorId) {
        return { success: false, nextStatus: workflow.status, nextValidatorIdx: workflow.current_validator_idx, allValidated: false, message: 'Ce n\'est pas votre tour de valider' };
      }

      // 3. Créer la validation
      const { error: validationError } = await supabase
        .from('task_visa_validations')
        .insert({
          workflow_id: workflowId,
          validator_id: validatorId,
          version: workflow.current_version,
          opinion: data.opinion,
          comment: data.comment
        });

      if (validationError) throw validationError;

      // 4. Déterminer le prochain statut
      let nextStatus: VisaWorkflowStatus = workflow.status;
      let nextValidatorIdx = workflow.current_validator_idx;
      let allValidated = false;
      let message = '';

      // Si Favorable : passer au validateur suivant ou valider complètement
      if (data.opinion === 'F') {
        if (workflow.current_validator_idx < workflow.validator_order.length - 1) {
          // Passer au validateur suivant
          nextValidatorIdx = workflow.current_validator_idx + 1;
          nextStatus = 'pending_validation';
          message = 'Avis favorable enregistré. Passage au validateur suivant.';
        } else {
          // Tous les validateurs ont approuvé
          nextStatus = 'validated';
          allValidated = true;
          message = 'Document validé par tous les validateurs !';
        }
      } else if (data.opinion === 'D') {
        // Défavorable : retour à l'exécutant
        nextStatus = 'revision_required';
        message = 'Avis défavorable : l\'exécutant doit corriger et resoumettre.';
      } else if (data.opinion === 'S') {
        // Suspendu
        nextStatus = 'suspended';
        message = 'Document suspendu en attendant des éléments complémentaires.';
      } else if (data.opinion === 'HM') {
        // Hors mission
        nextStatus = 'out_of_scope';
        message = 'Document hors mission.';
      }

      // 5. Mettre à jour le workflow
      const { error: updateError } = await supabase
        .from('task_visa_workflows')
        .update({
          status: nextStatus,
          current_validator_idx: nextValidatorIdx,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId);

      if (updateError) throw updateError;

      // 6. Ajouter à l'historique
      const action = data.opinion === 'F' ? 'validated' : 
                    data.opinion === 'D' ? 'rejected' :
                    data.opinion === 'S' ? 'suspended' : 'out_of_scope';

      await supabase.from('task_visa_history').insert({
        workflow_id: workflowId,
        version: workflow.current_version,
        action,
        actor_id: validatorId,
        actor_role: 'validator',
        comment: `${VISA_OPINION_LABELS[data.opinion].label}: ${data.comment}`
      });

      toast({
        title: 'Avis enregistré',
        description: message
      });

      return { success: true, nextStatus, nextValidatorIdx, allValidated, message };
    } catch (error) {
      console.error('Erreur submitValidation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer l\'avis',
        variant: 'destructive'
      });
      return { success: false, nextStatus: 'pending_validation', nextValidatorIdx: 0, allValidated: false, message: 'Erreur technique' };
    }
  }, [toast]);

  return {
    fetchWorkflow,
    submitDocument,
    submitValidation
  };
};

// Helper pour les labels
const VISA_OPINION_LABELS: Record<VisaOpinion, { label: string }> = {
  'F': { label: 'Favorable' },
  'D': { label: 'Défavorable' },
  'S': { label: 'Suspendu' },
  'HM': { label: 'Hors Mission' }
};
