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
  created_by: string; // UUID de l'utilisateur qui a créé le projet
  created_at: string;
  updated_at?: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  task_type: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
  
  // Assignation
  assigned_to: string;
  assigned_by?: string;
  assigned_at: string;
  
  // Validation
  validators: string[];
  validated_by?: string;
  validated_at?: string;
  
  // Dates importantes
  due_date: string;
  started_at?: string;
  submitted_at?: string;
  completed_at?: string;
  
  // Fichiers et commentaires
  file_url?: string;
  file_name?: string;
  file_size?: number;
  comments?: string;
  validation_comments?: string;
  
  // Priorité
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Métadonnées
  created_at: string;
  updated_at: string;
  
  // Relations
  project?: Project;
  assigned_user?: Profile;
  validator_users?: Profile[];
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
}

export interface TaskFormData {
  title: string;
  description?: string;
  task_type: string;
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

export const TASK_STATUSES: { value: ProjectTask['status']; label: string }[] = [
  { value: 'assigned', label: 'Assigné' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'submitted', label: 'Soumis' },
  { value: 'validated', label: 'Validé' },
  { value: 'rejected', label: 'Rejeté' }
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