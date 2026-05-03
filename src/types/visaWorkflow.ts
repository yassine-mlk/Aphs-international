// ============================================================
// Types pour le Workflow VISA
// ============================================================

// Types d'avis des validateurs
export type VisaOpinion = 'F' | 'D' | 'S' | 'HM';

export const VISA_OPINION_LABELS: Record<VisaOpinion, { label: string; description: string; color: string; standardLabel?: string }> = {
  'F': { 
    label: 'Favorable', 
    standardLabel: 'Valide',
    description: 'Conformité aux normes applicables',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  'D': { 
    label: 'Défavorable', 
    standardLabel: 'Non Valide',
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

// Helper pour obtenir les opinions valides selon le type de tâche
export const getValidOpinions = (taskType: 'standard' | 'workflow'): VisaOpinion[] => {
  if (taskType === 'standard') {
    return ['F', 'D'];
  }
  return ['F', 'D', 'S', 'HM'];
};

// Statuts du workflow
export type VisaWorkflowStatus = 
  | 'pending_execution'    // En attente de soumission par l'exécutant
  | 'pending_validation'   // En attente de validation
  | 'revision_required'    // Rejeté, l'exécutant doit resoumettre
  | 'validated'           // Tous les validateurs ont approuvé
  | 'suspended'           // Suspendu
  | 'blocked'             // Bloqué car limite de révisions atteinte
  | 'out_of_scope';       // Hors mission

export const VISA_STATUS_LABELS: Record<VisaWorkflowStatus, { label: string; color: string }> = {
  'pending_execution': { label: 'En attente de soumission', color: 'bg-yellow-100 text-yellow-800' },
  'pending_validation': { label: 'En attente de validation', color: 'bg-blue-100 text-blue-800' },
  'revision_required': { label: 'Révision requise', color: 'bg-orange-100 text-orange-800' },
  'validated': { label: 'Validé', color: 'bg-green-100 text-green-800' },
  'suspended': { label: 'Suspendu', color: 'bg-purple-100 text-purple-800' },
  'blocked': { label: 'Bloquée (Limite atteinte)', color: 'bg-red-100 text-red-800' },
  'out_of_scope': { label: 'Hors mission', color: 'bg-gray-100 text-gray-800' }
};

// Interface pour le workflow
export interface VisaWorkflow {
  id: string;
  task_id: string;
  executor_id: string;
  validator_order: string[];
  current_validator_idx: number;
  status: VisaWorkflowStatus;
  current_version: number;
  created_at: string;
  updated_at: string;
}

// Interface pour une validation (Review)
export interface VisaValidation {
  id: string;
  submission_id: string;
  validator_id: string;
  opinion: VisaOpinion;
  comment: string;
  reviewed_at: string;
  validator_name?: string; // Jointure
}

// Interface pour une soumission
export interface VisaSubmission {
  id: string;
  task_id: string;
  version?: number; // Optionnel pour standard
  version_label?: string; // Nouveau: A, B, C
  visa_status?: 'vso' | 'vao' | 'var'; // Nouveau: résultat final
  executor_id: string;
  file_url: string;
  file_name: string;
  comment?: string;
  submitted_at: string;
  executor_name?: string; // Jointure
  reviews?: VisaValidation[];
}

// Interface complète pour le workflow (basée sur une tâche)
export interface VisaWorkflowFull {
  id: string; // ID de la tâche
  task_name: string;
  project_id: string;
  project_name: string;
  tenant_id?: string; // Ajouté
  status: string;
  task_type: 'standard' | 'workflow';
  executor_ids: string[];
  validators: {
    user_id: string;
    validator_order: number;
    days_limit: number;
    name?: string;
  }[];
  submissions: VisaSubmission[];
  current_submission?: VisaSubmission;
  current_validator_id?: string;
  current_validator_name?: string;
  current_validator_idx?: number;
  current_version?: number;
  current_version_label?: string;
  validator_order?: string[];
  all_names?: Record<string, string>; // user_id -> name
  validation_summary?: {
    total_executors: number;
    submitted_executors: number;
    total_validators: number;
    has_rejections: boolean;
    is_fully_submitted: boolean;
  };
  history?: any[];
  created_at: string;
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
