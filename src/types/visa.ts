/**
 * Types pour le système de Visa Workflow
 * Généré manuellement depuis le schéma SQL
 */

// ============================================
// CIRCUITS DE VISA
// ============================================
export interface VisaCircuitStep {
  role: string;
  user_id: string;
  deadline_days: number;
  order_index: number;
}

export interface VisaCircuit {
  id: string;
  project_id: string;
  name: string;
  document_type: 'plan' | 'note' | 'rapport' | 'fiche' | 'devis';
  steps: VisaCircuitStep[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// SOUMISSIONS (dépôts de fichiers)
// ============================================
export interface TaskSubmission {
  id: string;
  assignment_id: string;
  occurrence_number: number;
  period_label: string | null;
  version_index: string;
  file_url: string;
  file_name: string;
  submitted_by: string;
  submitted_at: string;
  
  // Mode validation simple
  simple_status: 'pending' | 'validated' | 'refused';
  simple_validated_by: string | null;
  simple_validated_at: string | null;
  simple_comments: string | null;
  
  // Mode visa
  visa_instance_id: string | null;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// INSTANCES VISA
// ============================================
export type VisaInstanceStatus = 'en_cours' | 'valide' | 'refuse' | 'suspendu';

export interface VisaInstance {
  id: string;
  submission_id: string;
  circuit_id: string;
  emitted_by: string;
  emitted_by_role: string;
  version_index: string;
  current_step_index: number;
  total_steps: number;
  status: VisaInstanceStatus;
  started_at: string;
  deadline_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// ÉTAPES DE VISA
// ============================================
export type OpinionType = 'F' | 'D' | 'S' | 'HM';
export type VisaStatus = 'VSO' | 'VAO' | 'VAR';

export interface VisaStep {
  id: string;
  instance_id: string;
  step_order: number;
  validator_user_id: string;
  validator_role: string;
  deadline_at: string | null;
  
  // Avis technique
  opinion: OpinionType | null;
  opinion_comment: string | null;
  
  // Visa final
  visa_status: VisaStatus | null;
  visa_comment: string | null;
  
  // Timing
  notified_at: string | null;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ============================================
// OCCURRENCES RÉCURRENTES
// ============================================
export interface RecurringOccurrence {
  id: string;
  assignment_id: string;
  occurrence_number: number;
  period_start: string | null;
  period_end: string | null;
  period_label: string | null;
  status: 'en_attente' | 'en_cours' | 'valide' | 'refuse' | 'depasse';
  submission_id: string | null;
  visa_instance_id: string | null;
  deadline_at: string | null;
  created_at: string;
}

// ============================================
// HISTORIQUE
// ============================================
export interface VisaHistory {
  id: string;
  instance_id: string | null;
  submission_id: string | null;
  step_id: string | null;
  action: string;
  actor_id: string;
  actor_role: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ============================================
// VUES
// ============================================
export interface VisaValidatorQueue {
  step_id: string;
  instance_id: string;
  step_order: number;
  deadline_at: string | null;
  validator_user_id: string;
  circuit_id: string;
  version_index: string;
  instance_status: VisaInstanceStatus;
  project_id: string;
  circuit_name: string;
  file_url: string;
  file_name: string;
  submitted_by: string;
  submitted_at: string;
  project_title: string;
}

// ============================================
// PAYLOADS POUR ACTIONS
// ============================================
export interface StartVisaPayload {
  submission_id: string;
  circuit_id: string;
  emitted_by: string;
  emitted_by_role: string;
}

export interface SubmitOpinionPayload {
  step_id: string;
  opinion: OpinionType;
  visa_status: VisaStatus;
  comments?: string;
}

export interface ResubmitPayload {
  instance_id: string;
  new_file_url: string;
  new_file_name: string;
  submitted_by: string;
}

// ============================================
// RÉSULTATS
// ============================================
export interface VisaWorkflowResult {
  success: boolean;
  instance_id?: string;
  step_id?: string;
  next_step_id?: string;
  error?: string;
}

