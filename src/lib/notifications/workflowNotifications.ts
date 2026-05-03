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
    link: `/dashboard/tasks/${taskId}`
  }));

  // 2. Notifier l'ADMIN
  const adminNotifications = adminIds.map(adminId => ({
    userId: adminId,
    tenantId: task.tenant_id,
    type: 'workflow_submission_admin',
    title: `Nouvelle soumission — ${task.task_name}`,
    message: `${executorName} a soumis la révision ${versionLabel} pour la tâche ${task.task_name} — projet ${task.project_name}`,
    link: `/dashboard/tasks/${taskId}`
  }));

  await sendBulkNotifications([...validatorNotifications, ...adminNotifications]);
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
    link: `/dashboard/tasks/${taskId}`
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
      link: `/dashboard/tasks/${taskId}`
    });

    await sendBulkNotifications(adminIds.map(adminId => ({
      userId: adminId,
      tenantId: task.tenant_id,
      type: 'visa_vso_admin',
      title: `✅ VSO obtenu — action requise`,
      message: `La tâche ${task.task_name} — projet ${task.project_name} a obtenu un visa VSO. Vous pouvez la clôturer.`,
      link: `/dashboard/tasks/${taskId}`
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
      link: `/dashboard/tasks/${taskId}`
    });

    await sendBulkNotifications(adminIds.map(adminId => ({
      userId: adminId,
      tenantId: task.tenant_id,
      type: 'visa_result_admin',
      title: `Visa émis : ${visa.toUpperCase()} — ${task.task_name}`,
      message: `Un visa ${visa.toUpperCase()} a été émis pour la tâche ${task.task_name} (Projet: ${task.project_name}).`,
      link: `/dashboard/tasks/${taskId}`
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
    type: 'workflow_blocked_admin',
    title: `⛔ Circuit bloqué — intervention requise`,
    message: `La tâche ${task.task_name} — projet ${task.project_name} a atteint ${maxRevisions} révisions sans VSO. Votre intervention est nécessaire.`,
    link: `/dashboard/tasks/${taskId}`
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
    .select('task_name')
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
    type: `task_${action}`,
    title,
    message,
    link: `/dashboard/tasks/${taskId}`
  });
}
