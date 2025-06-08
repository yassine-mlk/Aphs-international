// Types pour les assignements de tâches
// Basé sur l'interface TaskAssignment de ProjectDetails.tsx

export type TaskStatus = 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
export type PhaseId = 'conception' | 'realisation';
export type FileExtension = 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'jpg' | 'png' | 'dwg' | 'other';

// Interface principale pour un assignement de tâche
export interface TaskAssignment {
  id?: string;
  project_id: string;
  phase_id: PhaseId;
  section_id: string; // "A", "B", "C", etc.
  subsection_id: string; // "A1", "A2", "B1", etc.
  task_name: string;
  assigned_to: string; // UUID de l'intervenant
  deadline: string; // ISO string
  validation_deadline: string; // ISO string
  validators: string[]; // Array des UUIDs des validateurs
  file_extension: FileExtension;
  comment?: string;
  status: TaskStatus;
  created_at?: string;
  updated_at?: string;
  // Champs pour le suivi des soumissions
  file_url?: string;
  validation_comment?: string;
  submitted_at?: string;
  validated_at?: string;
  validated_by?: string;
}

// Interface pour créer un nouvel assignement
export interface CreateTaskAssignmentData {
  project_id: string;
  phase_id: PhaseId;
  section_id: string;
  subsection_id: string;
  task_name: string;
  assigned_to: string;
  deadline: string;
  validation_deadline: string;
  validators: string[];
  file_extension: FileExtension;
  comment?: string;
}

// Interface pour mettre à jour un assignement
export interface UpdateTaskAssignmentData {
  id: string;
  assigned_to?: string;
  deadline?: string;
  validation_deadline?: string;
  validators?: string[];
  file_extension?: FileExtension;
  comment?: string;
  status?: TaskStatus;
  file_url?: string;
  validation_comment?: string;
  submitted_at?: string;
  validated_at?: string;
  validated_by?: string;
}

// Interface pour les statistiques d'assignements
export interface TaskAssignmentStats {
  total: number;
  assigned: number;
  in_progress: number;
  submitted: number;
  validated: number;
  rejected: number;
  overdue: number;
  due_soon: number; // dans les 3 prochains jours
}

// Interface pour les filtres de recherche
export interface TaskAssignmentFilters {
  project_id?: string;
  phase_id?: PhaseId;
  section_id?: string;
  assigned_to?: string;
  status?: TaskStatus;
  deadline_from?: string;
  deadline_to?: string;
  search?: string; // recherche dans task_name et comment
}

// Interface pour les données d'un intervenant (simplifié)
export interface TaskAssignmentIntervenant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  specialty?: string;
}

// Interface pour les détails d'un projet (simplifié)
export interface TaskAssignmentProject {
  id: string;
  name: string;
  description?: string;
  start_date: string;
}

// Interface enrichie avec les détails de l'intervenant et du projet
export interface TaskAssignmentWithDetails extends TaskAssignment {
  assignee?: TaskAssignmentIntervenant;
  project?: TaskAssignmentProject;
  validator_details?: TaskAssignmentIntervenant[];
}

// Constantes pour les statuts
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  assigned: 'Assignée',
  in_progress: 'En cours',
  submitted: 'Soumise',
  validated: 'Validée',
  rejected: 'Rejetée'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-purple-100 text-purple-800',
  validated: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

// Constantes pour les phases
export const PHASE_LABELS: Record<PhaseId, string> = {
  conception: 'Phase Conception',
  realisation: 'Phase Réalisation'
};

// Constantes pour les extensions de fichier
export const FILE_EXTENSIONS: Record<FileExtension, string> = {
  pdf: 'PDF',
  doc: 'Word (DOC)',
  docx: 'Word (DOCX)', 
  xls: 'Excel (XLS)',
  xlsx: 'Excel (XLSX)',
  jpg: 'Image JPEG',
  png: 'Image PNG',
  dwg: 'AutoCAD (DWG)',
  other: 'Autre'
};

// Fonctions utilitaires pour la validation
export const validateTaskAssignment = (data: CreateTaskAssignmentData): string[] => {
  const errors: string[] = [];
  
  if (!data.project_id) errors.push('ID du projet requis');
  if (!data.phase_id) errors.push('Phase du projet requise');
  if (!data.section_id) errors.push('Section requise');
  if (!data.subsection_id) errors.push('Sous-section requise');
  if (!data.task_name.trim()) errors.push('Nom de la tâche requis');
  if (!data.assigned_to) errors.push('Intervenant assigné requis');
  if (!data.deadline) errors.push('Date limite requise');
  if (!data.validation_deadline) errors.push('Date limite de validation requise');
  if (data.validators.length === 0) errors.push('Au moins un validateur requis');
  
  // Vérifier que l'assigné n'est pas dans les validateurs
  if (data.validators.includes(data.assigned_to)) {
    errors.push('L\'intervenant assigné ne peut pas être validateur');
  }
  
  // Vérifier l'ordre des dates
  if (data.deadline && data.validation_deadline) {
    const deadlineDate = new Date(data.deadline);
    const validationDate = new Date(data.validation_deadline);
    if (validationDate < deadlineDate) {
      errors.push('La date limite de validation doit être postérieure à la date limite de remise');
    }
  }
  
  return errors;
};

// Fonction pour vérifier si une tâche est en retard
export const isTaskOverdue = (assignment: TaskAssignment): boolean => {
  if (assignment.status === 'validated' || assignment.status === 'rejected') {
    return false;
  }
  
  const now = new Date();
  const deadline = new Date(assignment.deadline);
  return deadline < now;
};

// Fonction pour vérifier si une tâche est due bientôt (dans les 3 jours)
export const isTaskDueSoon = (assignment: TaskAssignment): boolean => {
  if (assignment.status === 'validated' || assignment.status === 'rejected') {
    return false;
  }
  
  const now = new Date();
  const deadline = new Date(assignment.deadline);
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);
  
  return deadline <= threeDaysFromNow && deadline > now;
};

// Fonction pour calculer les statistiques
export const calculateTaskStats = (assignments: TaskAssignment[]): TaskAssignmentStats => {
  return {
    total: assignments.length,
    assigned: assignments.filter(a => a.status === 'assigned').length,
    in_progress: assignments.filter(a => a.status === 'in_progress').length,
    submitted: assignments.filter(a => a.status === 'submitted').length,
    validated: assignments.filter(a => a.status === 'validated').length,
    rejected: assignments.filter(a => a.status === 'rejected').length,
    overdue: assignments.filter(isTaskOverdue).length,
    due_soon: assignments.filter(isTaskDueSoon).length
  };
}; 