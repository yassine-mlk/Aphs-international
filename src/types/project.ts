// Types pour les projets et tâches

export interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string; // Date de début obligatoire
  end_date?: string; // Date de fin optionnelle
  image_url?: string;
  company_id?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  show_info_sheets: boolean;
  created_by: string; // UUID de l'utilisateur qui a créé le projet
  created_at: string;
  updated_at?: string;
}

export type TaskType = 'standard' | 'workflow';
export type TaskStatus = 'open' | 'in_review' | 'approved' | 'rejected' | 'vso' | 'vao' | 'var' | 'closed' | 'blocked';

export interface Task {
  id: string;
  project_id: string;
  phase_id?: string;
  section_id?: string;
  subsection_id?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  deadline?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  file_extension?: string;
  start_date?: string;
  end_date?: string;
  validation_deadline?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  role: 'executor' | 'validator';
  validator_order?: number;
  days_limit?: number;
  created_at: string;
}

export interface TaskRevision {
  id: string;
  task_id: string;
  executor_id: string;
  indice: string;
  file_url: string;
  notes?: string;
  visa_status: 'pending' | 'vso' | 'vao' | 'var';
  submitted_at: string;
}

export interface TaskReview {
  id: string;
  revision_id: string;
  assignment_id: string;
  avis?: 'F' | 'D' | 'S' | 'HM';
  comment?: string;
  reviewed_at?: string;
  status: 'pending' | 'done';
}

export interface ProjectTask extends Task {
  // Champs pour la compatibilité avec l'existant
  assigned_to: string[]; 
  validators: any[]; // Peut être string[] ou {user_id, days_limit}[]
  project?: Project;
  assigned_users?: Profile[];
  validator_users?: Profile[];
  revisions?: TaskRevision[];
  assignments?: TaskAssignment[];
  
  // Aliases pour compatibilité
  due_date?: string; // alias pour deadline
  file_url?: string;
  file_name?: string;
  file_size?: number;
  submitted_at?: string;
  validated_at?: string;
  validated_by?: string;
  validation_comments?: string;
  completed_at?: string;
}

export interface ProjectTaskHistory {
  id: string;
  task_id: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  performed_by: string;
  performed_at: string;
  details?: any;
  comments?: string;
  previous_data?: any;
  new_data?: any;
  created_at: string;
  
  // Relations
  task?: ProjectTask;
  performed_by_user?: Profile;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'member' | 'viewer';
  added_by?: string;
  added_at: string;
  
  // Relations
  project?: Project;
  user?: Profile;
  added_by_user?: Profile;
}

export interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  company_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// Types pour les formulaires
export interface ProjectFormData {
  name: string;
  description: string;
  start_date: string;
  end_date?: string;
  image_url?: string;
  company_id?: string;
  status: Project['status'];
  show_info_sheets: boolean;
}

export interface TaskFormData {
  title: string;
  description?: string;
  task_type: TaskType;
  assigned_to: string;
  validators: string[];
  due_date: string;
  priority: ProjectTask['priority'];
  comments?: string;
  file?: File;
}

// Types pour les filtres et recherches
export interface ProjectFilters {
  status?: Project['status'];
  company_id?: string;
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
}

export interface TaskFilters {
  status?: ProjectTask['status'];
  assigned_to?: string;
  project_id?: string;
  priority?: ProjectTask['priority'];
  due_date_from?: string;
  due_date_to?: string;
  task_type?: string;
}

// Options pour les dropdowns
export const PROJECT_STATUSES: { value: Project['status']; label: string }[] = [
  { value: 'active', label: 'Actif' },
  { value: 'completed', label: 'Terminé' },
  { value: 'paused', label: 'En pause' },
  { value: 'cancelled', label: 'Annulé' }
];

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'open', label: 'Ouvert' },
  { value: 'in_review', label: 'En cours de revue' },
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'vso', label: 'Visa Sans Obs.' },
  { value: 'vao', label: 'Visa Avec Obs.' },
  { value: 'var', label: 'Visa À Resoumettre' },
  { value: 'closed', label: 'Clôturé' }
];

export const TASK_PRIORITIES: { value: ProjectTask['priority']; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Élevée' },
  { value: 'urgent', label: 'Urgente' }
];

export const PROJECT_MEMBER_ROLES: { value: ProjectMember['role']; label: string }[] = [
  { value: 'owner', label: 'Propriétaire' },
  { value: 'manager', label: 'Gestionnaire' },
  { value: 'member', label: 'Membre' },
  { value: 'viewer', label: 'Observateur' }
]; 