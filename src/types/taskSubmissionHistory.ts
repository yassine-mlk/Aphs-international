// Types pour l'historique des soumissions de tâches

export type TaskSubmissionActionType = 'submitted' | 'validated' | 'rejected' | 'resubmitted' | 'finalized';

export interface TaskSubmissionHistory {
  id: string;
  task_assignment_id: string;
  action_type: TaskSubmissionActionType;
  file_url?: string;
  file_name?: string;
  comment?: string;
  validation_comment?: string;
  performed_by: string;
  performed_at: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CreateTaskSubmissionHistoryData {
  task_assignment_id: string;
  action_type: TaskSubmissionActionType;
  file_url?: string;
  file_name?: string;
  comment?: string;
  validation_comment?: string;
  performed_by: string;
  metadata?: Record<string, any>;
}

export interface TaskSubmissionHistoryWithUser extends TaskSubmissionHistory {
  performer?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

// Labels pour les actions
export const TASK_SUBMISSION_ACTION_LABELS: Record<TaskSubmissionActionType, string> = {
  submitted: 'Soumis',
  resubmitted: 'Re-soumis',
  validated: 'Validé',
  rejected: 'Rejeté',
  finalized: 'Validation finale'
};

// Couleurs pour les actions dans l'historique
export const TASK_SUBMISSION_ACTION_COLORS: Record<TaskSubmissionActionType, string> = {
  submitted: 'bg-blue-500',
  resubmitted: 'bg-orange-500', 
  validated: 'bg-green-500',
  rejected: 'bg-red-500',
  finalized: 'bg-purple-500'
}; 