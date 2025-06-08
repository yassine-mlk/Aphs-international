// Migration des types legacy vers la nouvelle structure

import { ProjectTask } from './project';

// Type legacy TaskAssignment (à remplacer)
export interface LegacyTaskAssignment {
  id: string;
  project_id: string;
  phase_id: string; // "conception" or "realisation"
  section_id: string; // "A", "B", "C", etc.
  subsection_id: string; // "A1", "A2", "B1", etc.
  task_name: string;
  assigned_to: string; // ID of the intervenant
  deadline: string;
  validation_deadline: string;
  validators: string[]; // IDs of the intervenant validators
  file_extension: string;
  comment?: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'rejected';
  created_at: string;
  updated_at: string;
  file_url?: string;
  submitted_at?: string;
  validated_at?: string;
  validation_comment?: string;
  validated_by?: string;
  
  // Join fields
  project?: {
    id: string;
    name: string;
  };
  assigned_user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

// Fonction pour convertir LegacyTaskAssignment vers ProjectTask
export function convertLegacyToProjectTask(legacy: LegacyTaskAssignment): ProjectTask {
  return {
    id: legacy.id,
    project_id: legacy.project_id,
    title: legacy.task_name,
    description: `Phase: ${legacy.phase_id}, Section: ${legacy.section_id}, Sous-section: ${legacy.subsection_id}`,
    task_type: `${legacy.phase_id}_${legacy.section_id}`,
    status: legacy.status,
    assigned_to: legacy.assigned_to,
    assigned_by: '', // À compléter si disponible
    assigned_at: legacy.created_at,
    validators: legacy.validators,
    validated_by: legacy.validated_by,
    validated_at: legacy.validated_at,
    due_date: legacy.deadline,
    started_at: legacy.status === 'in_progress' ? legacy.updated_at : undefined,
    submitted_at: legacy.submitted_at,
    completed_at: legacy.validated_at,
    file_url: legacy.file_url,
    file_name: legacy.file_url ? `task_${legacy.id}.${legacy.file_extension}` : undefined,
    file_size: undefined,
    comments: legacy.comment,
    validation_comments: legacy.validation_comment,
    priority: 'medium', // Par défaut
    created_at: legacy.created_at,
    updated_at: legacy.updated_at,
    
    // Relations
    project: legacy.project ? {
      ...legacy.project,
      description: '',
      start_date: '',
      end_date: undefined,
      image_url: undefined,
      company_id: undefined,
      status: 'active' as const,
      created_at: '',
      updated_at: undefined
    } : undefined,
    assigned_user: legacy.assigned_user ? {
      user_id: legacy.assigned_user.id,
      first_name: legacy.assigned_user.first_name || '',
      last_name: legacy.assigned_user.last_name || '',
      email: legacy.assigned_user.email,
      role: legacy.assigned_user.role || '',
      created_at: '',
      updated_at: ''
    } : undefined
  };
}

// Fonction pour convertir ProjectTask vers LegacyTaskAssignment (pour la compatibilité)
export function convertProjectTaskToLegacy(task: ProjectTask): LegacyTaskAssignment {
  // Parser la description pour extraire phase, section, subsection
  const description = task.description || '';
  const phaseMatch = description.match(/Phase:\s*(\w+)/);
  const sectionMatch = description.match(/Section:\s*(\w+)/);
  const subsectionMatch = description.match(/Sous-section:\s*(\w+)/);
  
  return {
    id: task.id,
    project_id: task.project_id,
    phase_id: phaseMatch ? phaseMatch[1] : 'conception',
    section_id: sectionMatch ? sectionMatch[1] : 'A',
    subsection_id: subsectionMatch ? subsectionMatch[1] : 'A1',
    task_name: task.title,
    assigned_to: task.assigned_to,
    deadline: task.due_date,
    validation_deadline: task.due_date, // Même date par défaut
    validators: task.validators,
    file_extension: task.file_name ? task.file_name.split('.').pop() || 'pdf' : 'pdf',
    comment: task.comments,
    status: task.status,
    created_at: task.created_at,
    updated_at: task.updated_at,
    file_url: task.file_url,
    submitted_at: task.submitted_at,
    validated_at: task.validated_at,
    validation_comment: task.validation_comments,
    validated_by: task.validated_by,
    
    // Join fields
    project: task.project,
    assigned_user: task.assigned_user ? {
      id: task.assigned_user.user_id,
      email: task.assigned_user.email,
      first_name: task.assigned_user.first_name,
      last_name: task.assigned_user.last_name,
      role: task.assigned_user.role
    } : undefined
  };
} 