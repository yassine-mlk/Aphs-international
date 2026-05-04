import { sendNotification, sendBulkNotifications, getTenantAdmins, getUserName } from './sendNotification';
import { supabase } from '@/lib/supabase';

/**
 * Notifier quand l'exécuteur soumet une révision
 */
export async function notifyWorkflowSubmission(taskId: string, executorId: string, versionLabel: string) {
  const { data: task } = await supabase
    .from('task_assignments_view')
    .select('task_name, project_name, tenant_id, validators')
    .eq('id', taskId)
    .single();

  if (!task) return;

  const executorName = await getUserName(executorId);
  const validators = (task.validators as any[]) || [];
  const adminIds = await getTenantAdmins(task.tenant_id);

  // 1. Notifier TOUS les validateurs
  const validatorNotifications = validators.map(v => ({
    userId: v.user_id,
    tenantId: task.tenant_id,
    type: 'workflow_submission',
    title: `Nouvelle révision soumise — ${task.task_name}`,
    message: `Une nouvelle révision (indice ${versionLabel}) a été soumise par ${executorName}. Votre avis sera requis selon l'ordre du circuit.`,
    link: `/dashboard/tasks/${taskId}`,
    referenceId: `workflow_sub_${taskId}_${v.user_id}_${versionLabel}`
  }));

  // 2. Notifier TOUS les admins
  const adminNotifications = adminIds.map(adminId => ({
    userId: adminId,
    tenantId: task.tenant_id,
    type: 'workflow_submission_admin',
    title: `Nouvelle soumission — ${task.task_name}`,
    message: `${executorName} a soumis la révision ${versionLabel} pour la tâche ${task.task_name} — projet ${task.project_name}`,
    link: `/dashboard/tasks/${taskId}`,
    referenceId: `workflow_sub_admin_${taskId}_${adminId}_${versionLabel}`
  }));

  await sendBulkNotifications([...validatorNotifications, ...adminNotifications]);
}

/**
 * Notifier l'exécuteur qu'une tâche workflow lui a été assignée
 */
export async function notifyWorkflowTaskAssigned(taskId: string, executorId: string) {
  // 1. Récupérer les infos depuis les tables de base
  const { data: taskData, error: taskError } = await supabase
    .from('workflow_tasks')
    .select('title, project_id, deadline, tenant_id')
    .eq('id', taskId)
    .single();

  if (taskError || !taskData) {
    console.error('notifyWorkflowTaskAssigned: task not found', taskError);
    return;
  }

  // 2. Récupérer le nom du projet
  const { data: projectData } = await supabase
    .from('projects')
    .select('name')
    .eq('id', taskData.project_id)
    .single();

  const projectName = projectData?.name || 'Projet';
  const deadlineText = taskData.deadline ? ` Échéance : ${new Date(taskData.deadline).toLocaleDateString('fr-FR')}` : '';

  await sendNotification({
    userId: executorId,
    tenantId: taskData.tenant_id,
    type: 'task_assigned',
    title: `📋 Nouvelle tâche workflow assignée — ${taskData.title}`,
    message: `Vous avez été assigné comme exécuteur sur la tâche "${taskData.title}" dans le projet "${projectName}".${deadlineText} Veuillez soumettre la première révision (Indice A).`,
    link: `/dashboard/tasks/${taskId}`,
    referenceId: `task_assigned_workflow_${taskId}_${executorId}_${Date.now()}`
  });
}

/**
 * Notifier le validateur dont c'est le tour
 */
export async function notifyValidatorTurn(taskId: string, validatorId: string, versionLabel: string, deadline?: string) {
  const { data: task } = await supabase
    .from('task_assignments_view')
    .select('task_name, tenant_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  const deadlineText = deadline ? ` Échéance : ${new Date(deadline).toLocaleDateString('fr-FR')}` : '';

  await sendNotification({
    userId: validatorId,
    tenantId: task.tenant_id,
    type: 'validator_turn',
    title: `Votre avis est requis — ${task.task_name}`,
    message: `C'est à votre tour de valider la révision ${versionLabel} de ${task.task_name}.${deadlineText}`,
    link: `/dashboard/tasks/${taskId}`,
    referenceId: `validator_turn_${taskId}_${validatorId}_${versionLabel}`
  });
}

/**
 * Notifier le résultat du visa (VSO, VAR, VAO)
 */
export async function notifyVisaResult(taskId: string, visa: string, executorId: string, versionLabel: string, comments?: string[]) {
  const { data: task } = await supabase
    .from('task_assignments_view')
    .select('task_name, project_name, tenant_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  const adminIds = await getTenantAdmins(task.tenant_id);

  if (visa === 'vso') {
    // Cas VSO
    await sendNotification({
      userId: executorId,
      tenantId: task.tenant_id,
      type: 'visa_vso',
      title: `✅ Visa Sans Observations — ${task.task_name}`,
      message: `Votre document ${task.task_name} a obtenu un visa VSO. En attente de clôture par l'admin.`,
      link: `/dashboard/tasks/${taskId}`,
      referenceId: `visa_vso_${taskId}_${executorId}_${versionLabel}`
    });

    await sendBulkNotifications(adminIds.map(adminId => ({
      userId: adminId,
      tenantId: task.tenant_id,
      type: 'visa_vso_admin',
      title: `✅ VSO obtenu — action requise`,
      message: `La tâche ${task.task_name} — projet ${task.project_name} a obtenu un visa VSO. Vous pouvez la clôturer.`,
      link: `/dashboard/tasks/${taskId}`,
      referenceId: `visa_vso_admin_${taskId}_${adminId}_${versionLabel}`
    })));
  } else {
    // Cas VAR ou VAO
    const nextVersionLabel = String.fromCharCode(versionLabel.charCodeAt(0) + 1);
    const observations = comments?.length ? ` Observations : ${comments.join(', ')}` : '';

    await sendNotification({
      userId: executorId,
      tenantId: task.tenant_id,
      type: visa === 'var' ? 'visa_var' : 'visa_vao',
      title: `${visa === 'var' ? '⚠️ Visa Avec Réserves' : '❌ Visa Au Rejet'} — ${task.task_name}`,
      message: `Votre document a obtenu un visa ${visa.toUpperCase()}.${observations} Une nouvelle révision (Indice ${nextVersionLabel}) est attendue.`,
      link: `/dashboard/tasks/${taskId}`,
      referenceId: `visa_result_${taskId}_${executorId}_${versionLabel}`
    });

    await sendBulkNotifications(adminIds.map(adminId => ({
      userId: adminId,
      tenantId: task.tenant_id,
      type: 'visa_result_admin',
      title: `Visa émis : ${visa.toUpperCase()} — ${task.task_name}`,
      message: `Un visa ${visa.toUpperCase()} a été émis pour la tâche ${task.task_name} (Projet: ${task.project_name}).`,
      link: `/dashboard/tasks/${taskId}`,
      referenceId: `visa_result_admin_${taskId}_${adminId}_${versionLabel}`
    })));
  }
}

/**
 * Notifier quand le circuit est bloqué
 */
export async function notifyWorkflowBlocked(taskId: string, executorId: string, revisionCount: number, maxRevisions: number) {
  const { data: task } = await supabase
    .from('task_assignments_view')
    .select('task_name, project_name, tenant_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  const adminIds = await getTenantAdmins(task.tenant_id);

  await sendBulkNotifications(adminIds.map(adminId => ({
    userId: adminId,
    tenantId: task.tenant_id,
    type: 'workflow_blocked_admin',
    title: `⛔ Circuit bloqué — intervention requise`,
    message: `La tâche ${task.task_name} — projet ${task.project_name} a atteint ${maxRevisions} révisions sans VSO. Votre intervention est nécessaire.`,
    link: `/dashboard/tasks/${taskId}`,
    referenceId: `workflow_blocked_${taskId}_${adminId}`
  })));

  await sendNotification({
    userId: executorId,
    type: 'workflow_blocked',
    title: `⛔ Circuit bloqué — ${task.task_name}`,
    message: `Le circuit de validation a été bloqué après ${revisionCount} révisions. L'administrateur va intervenir.`,
    link: `/dashboard/tasks/${taskId}`
  });
}

/**
 * Notifier les actions admin (clôture, relance, réassignation)
 */
export async function notifyAdminTaskAction(taskId: string, executorId: string, action: 'closed' | 'relaunch' | 'reassignment') {
  const { data: task } = await supabase
    .from('task_assignments_view')
    .select('task_name, tenant_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  let title = '';
  let message = '';

  if (action === 'closed') {
    title = `✅ Tâche clôturée — ${task.task_name}`;
    message = `La tâche ${task.task_name} a été clôturée.`;
  } else if (action === 'relaunch') {
    title = `🔄 Circuit relancé — ${task.task_name}`;
    message = `Veuillez soumettre une nouvelle révision pour la tâche ${task.task_name}.`;
  } else if (action === 'reassignment') {
    title = `👥 Circuit réassigné — ${task.task_name}`;
    message = `Nouveaux validators assignés pour la tâche ${task.task_name}. Veuillez soumettre une nouvelle révision.`;
  }

  await sendNotification({
    userId: executorId,
    tenantId: task.tenant_id,
    type: `task_${action}`,
    title,
    message,
    link: `/dashboard/tasks/${taskId}`,
    referenceId: `admin_action_${taskId}_${executorId}_${action}_${Date.now()}`
  });
}
