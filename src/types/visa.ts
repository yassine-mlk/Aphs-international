// Types pour le système de Workflow VISA

export type DocumentType = 'plan' | 'doe' | 'rapport' | 'note' | 'autre';
export type WorkflowType = 'sequentiel' | 'parallele';
export type DocumentStatus = 'en_attente' | 'en_cours' | 'valide' | 'refuse';
export type ValidationStatus = 'en_attente' | 'valide' | 'valide_avec_reserves' | 'refuse';

export interface WorkflowStep {
  id: string;
  order: number;
  role: string;
  userId?: string;
  userName?: string;
  status: ValidationStatus;
  comment?: string;
  validatedAt?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  type: WorkflowType;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  version: number;
  fileUrl: string;
  fileName: string;
  status: DocumentStatus;
  workflowTemplateId: string;
  workflow: WorkflowStep[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  createdAt: string;
}

export interface ValidationItem {
  document: ProjectDocument;
  projectName: string;
  currentStep: WorkflowStep | null;
  isMyTurn: boolean;
  totalSteps: number;
  validatedSteps: number;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  plan: 'Plan',
  doe: 'DOE',
  rapport: 'Rapport',
  note: 'Note',
  autre: 'Autre'
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  valide: 'Validé',
  refuse: 'Refusé'
};

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  valide_avec_reserves: 'Validé avec réserves',
  refuse: 'Refusé'
};

export const WORKFLOW_TYPE_LABELS: Record<WorkflowType, string> = {
  sequentiel: 'Séquentiel',
  parallele: 'Parallèle'
};

export const STATUS_COLORS: Record<DocumentStatus | ValidationStatus, string> = {
  en_attente: 'bg-gray-100 text-gray-700',
  en_cours: 'bg-blue-100 text-blue-700',
  valide: 'bg-green-100 text-green-700',
  valide_avec_reserves: 'bg-orange-100 text-orange-700',
  refuse: 'bg-red-100 text-red-700'
};
