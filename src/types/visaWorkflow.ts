// ============================================================
// Types pour le Workflow VISA
// ============================================================

// Types d'avis des validateurs
export type VisaOpinion = 'F' | 'D' | 'S' | 'HM';

export const VISA_OPINION_LABELS: Record<VisaOpinion, { label: string; description: string; color: string }> = {
  'F': { 
    label: 'Favorable', 
    description: 'Conformité aux normes applicables',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  'D': { 
    label: 'Défavorable', 
    description: 'Non-conformité nécessitant une reprise des études',
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  'S': { 
    label: 'Suspendu', 
    description: 'Attente d\'éléments complémentaires pour statuer',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  'HM': { 
    label: 'Hors Mission', 
    description: 'Document en dehors du périmètre contractuel',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
};

// Statuts du workflow
export type VisaWorkflowStatus = 
  | 'pending_execution'    // En attente de soumission par l'exécutant
  | 'pending_validation'   // En attente de validation
  | 'revision_required'    // Rejeté, l'exécutant doit resoumettre
  | 'validated'           // Tous les validateurs ont approuvé
  | 'suspended'           // Suspendu
  | 'out_of_scope';       // Hors mission

export const VISA_STATUS_LABELS: Record<VisaWorkflowStatus, { label: string; color: string }> = {
  'pending_execution': { label: 'En attente de soumission', color: 'bg-yellow-100 text-yellow-800' },
  'pending_validation': { label: 'En attente de validation', color: 'bg-blue-100 text-blue-800' },
  'revision_required': { label: 'Révision requise', color: 'bg-orange-100 text-orange-800' },
  'validated': { label: 'Validé', color: 'bg-green-100 text-green-800' },
  'suspended': { label: 'Suspendu', color: 'bg-purple-100 text-purple-800' },
  'out_of_scope': { label: 'Hors mission', color: 'bg-gray-100 text-gray-800' }
};

// Interface pour le workflow
export interface VisaWorkflow {
  id: string;
  task_assignment_id: string;
  executor_id: string;
  validator_order: string[];
  current_validator_idx: number;
  status: VisaWorkflowStatus;
  current_version: number;
  created_at: string;
  updated_at: string;
}

// Interface pour une validation
export interface VisaValidation {
  id: string;
  workflow_id: string;
  validator_id: string;
  version: number;
  opinion: VisaOpinion;
  comment: string;
  created_at: string;
  validator_name?: string; // Jointure
  validator_avatar?: string; // Jointure
}

// Interface pour une soumission
export interface VisaSubmission {
  id: string;
  workflow_id: string;
  version: number;
  executor_id: string;
  file_url: string;
  file_name: string;
  comment?: string;
  submitted_at: string;
  executor_name?: string; // Jointure
}

// Interface pour l'historique
export interface VisaHistory {
  id: string;
  workflow_id: string;
  version: number;
  action: 'submitted' | 'validated' | 'rejected' | 'suspended' | 'out_of_scope' | 'resubmitted';
  actor_id: string;
  actor_role: 'executor' | 'validator';
  comment?: string;
  created_at: string;
  actor_name?: string; // Jointure
}

// Interface complète pour le workflow avec toutes ses données
export interface VisaWorkflowFull extends VisaWorkflow {
  validations: VisaValidation[];
  submissions: VisaSubmission[];
  history: VisaHistory[];
  current_validator_name?: string;
  executor_name?: string;
  validator_names?: Record<string, string>; // user_id -> name
}

// Données pour créer une validation
export interface CreateVisaValidationData {
  opinion: VisaOpinion;
  comment: string;
}

// Données pour créer une soumission
export interface CreateVisaSubmissionData {
  file_url: string;
  file_name: string;
  comment?: string;
}

// Résultat d'une action de validation
export interface VisaValidationResult {
  success: boolean;
  nextStatus: VisaWorkflowStatus;
  nextValidatorIdx: number;
  allValidated: boolean;
  message: string;
}
