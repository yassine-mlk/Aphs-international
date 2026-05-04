import { sendNotification, sendBulkNotifications, getTenantAdmins, getUserName } from './sendNotification';
import { supabase } from '@/lib/supabase';

/**
 * Formater une date pour les notifications
 */
function formatDate(dateStr: string) {
  if (!dateStr) return 'Non définie';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

/**
 * Vérifier si TOUS les executors d'une tâche standard ont soumis au moins un fichier
 */
export async function checkAllExecutorsSubmitted(taskId: string): Promise<boolean> {
  try {
    const { data: task } = await supabase
      .from('standard_tasks')
      .select('assigned_to')
      .eq('id', taskId)
      .single();

    if (!task || !task.assigned_to) return false;

    const { data: submissions } = await supabase
      .from('standard_task_submissions')
      .select('executor_id')
      .eq('task_id', taskId);

    const submittedExecutorIds = new Set(submissions?.map(s => s.executor_id) || []);
    
    return task.assigned_to.every((id: string) => submittedExecutorIds.has(id));
  } catch (error) {
    console.error('Error checking all executors submitted:', error);
    return false;
  }
}

/**
 * Vérifier si TOUS les validators d'une tâche standard ont donné leur avis
 * sur la DERNIÈRE soumission de CHAQUE executor
 */
export async function checkAllValidatorsReviewed(taskId: string): Promise<boolean> {
  try {
    const { data: task } = await supabase
      .from('standard_tasks')
      .select('validators, assigned_to')
      .eq('id', taskId)
      .single();

    if (!task || !task.validators) return false;

    const validatorIds = (task.validators as any[]).map(v => v.user_id);
    if (validatorIds.length === 0) return true;

    // Récupérer toutes les soumissions de la tâche
    const { data: submissions } = await supabase
      .from('standard_task_submissions')
      .select('id, executor_id')
      .eq('task_id', taskId);

    if (!submissions || submissions.length === 0) return false;

    // Pour chaque executor, trouver sa dernière soumission
    const lastSubmissionsByExecutor: Record<string, string> = {};
    submissions.forEach(s => {
      lastSubmissionsByExecutor[s.executor_id] = s.id;
    });

    // Vérifier si tous les executors ont soumis
    if (Object.keys(lastSubmissionsByExecutor).length < task.assigned_to.length) return false;

    // Vérifier les reviews pour chaque "dernière soumission"
    for (const subId of Object.values(lastSubmissionsByExecutor)) {
      const { data: reviews } = await supabase
        .from('standard_task_reviews')
        .select('validator_id')
        .eq('submission_id', subId);

      const reviewers = new Set(reviews?.map(r => r.validator_id) || []);
      if (!validatorIds.every(id => reviewers.has(id))) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking all validators reviewed:', error);
    return false;
  }
}

/**
 * NOTIFICATION 1 — Assignation de la tâche
 */
export async function notifyStandardTaskAssigned(
  taskId: string, 
  executorIds: string[], 
  validatorIds: string[],
  options?: { taskName?: string; projectName?: string; tenantId?: string; deadline?: string }
) {
  let taskName = options?.taskName;
  let projectName = options?.projectName;
  let tenantId = options?.tenantId;
  let deadline = options?.deadline;

  // Si on n'a pas les infos, on les cherche en base
  if (!taskName || !projectName || !tenantId) {
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('standard_tasks')
        .select('title, project_id, deadline, tenant_id')
        .eq('id', taskId)
        .single();

      if (taskData) {
        taskName = taskName || taskData.title;
        tenantId = tenantId || taskData.tenant_id;
        deadline = deadline || taskData.deadline;

        const { data: projectData } = await supabase
          .from('projects')
          .select('name, tenant_id')
          .eq('id', taskData.project_id)
          .single();
        
        if (projectData) {
          projectName = projectName || projectData.name || 'Projet';
          tenantId = tenantId || projectData.tenant_id;
        }
      }
    } catch (err) {
      console.error('notifyStandardTaskAssigned: unexpected error', err);
    }
  }

  if (!taskName || !tenantId) {
    return;
  }

  const timestamp = Date.now();

  // Pour chaque executor assigné
  for (const executorId of executorIds) {
    try {
      await sendNotification({
        userId: executorId,
        tenantId: tenantId,
        type: 'task_assigned',
        title: `📋 Nouvelle tâche assignée — ${taskName}`,
        message: `Vous avez été assigné comme exécutant sur la tâche "${taskName}" dans le projet "${projectName}". Échéance remise : ${formatDate(deadline || '')}.`,
        link: `/dashboard/tasks/${taskId}`,
        referenceId: `task_assigned_executor_${taskId}_${executorId}_${timestamp}`,
      });
    } catch (err) {
      console.error(`Failed to send notification to executor ${executorId}`, err);
    }
  }

  // Pour chaque validator assigné
  for (const validatorId of validatorIds) {
    try {
      await sendNotification({
        userId: validatorId,
        tenantId: tenantId,
        type: 'task_assigned',
        title: `👁 Vous êtes validateur — ${taskName}`,
        message: `Vous avez été désigné validateur sur la tâche "${taskName}" dans le projet "${projectName}". Vous serez notifié quand les fichiers seront soumis.`,
        link: `/dashboard/tasks/${taskId}`,
        referenceId: `task_assigned_validator_${taskId}_${validatorId}_${timestamp}`,
      });
    } catch (err) {
      console.error(`Failed to send notification to validator ${validatorId}`, err);
    }
  }
}

/**
 * NOTIFICATION 2 — Un executor soumet un fichier
 */
export async function notifyStandardTaskSubmission(taskId: string, executorId: string, submissionId: string) {
  const { data: task } = await supabase
    .from('task_assignments_view')
    .select('task_name, tenant_id, validators, created_by')
    .eq('id', taskId)
    .single();

  if (!task) return;

  // Vérifier s'il y a déjà eu des soumissions de cet executor (pour savoir si c'est une relance)
  const { count } = await supabase
    .from('standard_task_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId)
    .eq('executor_id', executorId);

  const isResubmission = (count || 0) > 1;
  const executorName = await getUserName(executorId);
  const validatorIds = ((task.validators as any[]) || []).map(v => v.user_id);

  const title = isResubmission 
    ? `🔄 Nouveau fichier soumis (Relance) — ${task.task_name}`
    : `📎 Fichier soumis — ${task.task_name}`;
    
  const message = isResubmission
    ? `${executorName} a soumis une nouvelle version du fichier pour la tâche "${task.task_name}". Veuillez statuer à nouveau.`
    : `${executorName} a soumis un fichier pour la tâche "${task.task_name}". Vous pouvez maintenant donner votre avis.`;

  // Notifier TOUS les validators de la tâche
  for (const validatorId of validatorIds) {
    await sendNotification({
      userId: validatorId,
      tenantId: task.tenant_id,
      type: 'file_submitted',
      title: title,
      message: message,
      link: `/dashboard/tasks/${taskId}`,
      referenceId: `file_submitted_${submissionId}_${validatorId}`,
    });
  }

  // Vérifier si TOUS les executors ont soumis
  const allSubmitted = await checkAllExecutorsSubmitted(taskId);
  console.log('allSubmitted check:', allSubmitted);
  if (allSubmitted) {
    // Notifier TOUS les admins du tenant
    const adminIds = await getTenantAdmins(task.tenant_id);
    console.log('Notifying admins (allSubmitted):', adminIds);
    for (const adminId of adminIds) {
      await sendNotification({
        userId: adminId,
        tenantId: task.tenant_id,
        type: 'all_submitted',
        title: `✅ Toutes les soumissions reçues — ${task.task_name}`,
        message: `Tous les exécutants ont soumis leurs fichiers pour la tâche "${task.task_name}". Les validateurs ont été notifiés.`,
        link: `/dashboard/tasks/${taskId}`,
        referenceId: `all_submitted_${taskId}_${adminId}`,
      });
    }
  }
}

/**
 * NOTIFICATION 3 — Un validator donne son avis
 */
export async function notifyValidatorReview(taskId: string, validatorId: string, reviewId: string, opinion: string) {
  const { data: task } = await supabase
    .from('task_assignments_view')
    .select('task_name, created_by, tenant_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  const validatorName = await getUserName(validatorId);
  const avisText = opinion === 'approved' || opinion === 'F' ? 'Favorable' : 'Défavorable';

  // Notifier TOUS les admins du tenant
  const adminIds = await getTenantAdmins(task.tenant_id);
  console.log('Notifying admins (reviewSubmitted):', adminIds);
  for (const adminId of adminIds) {
    await sendNotification({
      userId: adminId,
      tenantId: task.tenant_id,
      type: 'review_submitted',
      title: `🗳 Avis donné — ${task.task_name}`,
      message: `${validatorName} a donné son avis (${avisText}) sur la tâche "${task.task_name}".`,
      link: `/dashboard/tasks/${taskId}`,
      referenceId: `review_submitted_${reviewId}_${adminId}`,
    });
  }

  // Vérifier si TOUS les validators ont répondu
  const allReviewed = await checkAllValidatorsReviewed(taskId);
  console.log('allReviewed check:', allReviewed);
  if (allReviewed) {
    // Notifier TOUS les admins pour qu'ils statuent
    console.log('Notifying admins (readyForDecision):', adminIds);
    for (const adminId of adminIds) {
      await sendNotification({
        userId: adminId,
        tenantId: task.tenant_id,
        type: 'ready_for_decision',
        title: `🏁 Tous les avis reçus — action requise`,
        message: `Tous les validateurs ont donné leur avis sur la tâche "${task.task_name}". Vous pouvez maintenant statuer.`,
        link: `/dashboard/tasks/${taskId}`,
        referenceId: `ready_for_decision_${taskId}_${adminId}`,
      });
    }
  }
}

/**
 * NOTIFICATION 4 & 5 — L'admin statue (validation/clôture)
 */
export async function notifyStandardTaskDecision(taskId: string, decision: 'approved' | 'closed', participantIds: string[], hasNegativeReview: boolean = false) {
  const { data: task } = await supabase
    .from('task_assignments_view')
    .select('task_name, tenant_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  const message = hasNegativeReview 
    ? `L'administrateur a clôturé la tâche "${task.task_name}" malgré un ou plusieurs avis défavorables.`
    : `L'administrateur a validé et clôturé la tâche "${task.task_name}". Elle est maintenant marquée comme terminée.`;

  // Notifier TOUS les intervenants (executors + validators)
  for (const userId of participantIds) {
    await sendNotification({
      userId: userId,
      tenantId: task.tenant_id,
      type: 'task_closed',
      title: `✅ Tâche validée — ${task.task_name}`,
      message: message,
      link: `/dashboard/tasks/${taskId}`,
      referenceId: `task_closed_${taskId}_${userId}`,
    });
  }
}

/**
 * NOTIFICATION 6 — Relance partielle ou complète
 */
export async function notifyStandardTaskRelaunch(taskId: string, relancedExecutorIds: string[], validatorIds: string[]) {
  const { data: task } = await supabase
    .from('task_assignments_view')
    .select('task_name, tenant_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  // 1. Notifier CHAQUE executor relancé uniquement
  for (const executorId of relancedExecutorIds) {
    await sendNotification({
      userId: executorId,
      tenantId: task.tenant_id,
      type: 'task_relaunched',
      title: `🔄 Nouvelle soumission requise — ${task.task_name}`,
      message: `Votre soumission pour la tâche "${task.task_name}" a reçu un avis défavorable. Vous devez soumettre un nouveau fichier.`,
      link: `/dashboard/tasks/${taskId}`,
      referenceId: `relaunched_${taskId}_${executorId}_${Date.now()}`,
    });
  }

  // 2. Notifier TOUS les validateurs car ils devront restatuer
  for (const validatorId of validatorIds) {
    await sendNotification({
      userId: validatorId,
      tenantId: task.tenant_id,
      type: 'task_relaunched',
      title: `🔄 Tâche relancée — ${task.task_name}`,
      message: `La tâche "${task.task_name}" a été relancée par l'administrateur. Vous devrez statuer à nouveau sur les nouvelles soumissions.`,
      link: `/dashboard/tasks/${taskId}`,
      referenceId: `relaunched_validator_${taskId}_${validatorId}_${Date.now()}`,
    });
  }
}
