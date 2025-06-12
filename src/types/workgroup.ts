// Types pour les groupes de travail

import { Profile } from './profile';

export type WorkgroupStatus = 'active' | 'inactive' | 'archived';
export type WorkgroupMemberRole = 'admin' | 'member';

// Interface principale pour un groupe de travail
export interface Workgroup {
  id: string;
  name: string;
  description?: string;
  project_id?: string;
  creator_id: string;
  status: WorkgroupStatus;
  created_at: string;
  updated_at: string;
}

// Interface pour un membre de groupe de travail
export interface WorkgroupMember {
  id: string;
  workgroup_id: string;
  profile_id: string;
  role_in_group: WorkgroupMemberRole;
  joined_at: string;
}

// Interface étendue avec les statistiques
export interface WorkgroupWithStats {
  id: string;
  name: string;
  description?: string;
  project_id?: string;
  creator_id: string;
  status: WorkgroupStatus;
  created_at: string;
  updated_at: string;
  creator_name: string;
  member_count: number;
}

// Interface pour les détails des membres
export interface WorkgroupMemberDetail {
  id: string;
  workgroup_id: string;
  profile_id: string;
  role_in_group: WorkgroupMemberRole;
  joined_at: string;
  workgroup_name: string;
  member_name: string;
  member_email: string;
  member_specialty?: string;
  member_company: string;
}

// Interface pour les données du formulaire de création de groupe
export interface WorkgroupFormData {
  name: string;
  description?: string;
  project_id?: string;
}

// Interface pour les données de mise à jour
export interface WorkgroupUpdateData {
  name?: string;
  description?: string;
  status?: WorkgroupStatus;
}

// Interface pour les filtres de recherche
export interface WorkgroupFilters {
  status?: WorkgroupStatus;
  creator_id?: string;
  project_id?: string;
}

// Interface pour les options de tri
export interface WorkgroupSortOptions {
  field: 'name' | 'created_at' | 'member_count' | 'status';
  direction: 'asc' | 'desc';
}

// Options pour les dropdowns
export const WORKGROUP_STATUSES: { value: WorkgroupStatus; label: string }[] = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'archived', label: 'Archivé' }
];

export const WORKGROUP_MEMBER_ROLES: { value: WorkgroupMemberRole; label: string }[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'member', label: 'Membre' }
];

// Helper pour vérifier si un utilisateur est admin d'un groupe
export const isWorkgroupAdmin = (members: WorkgroupMember[], profileId: string): boolean => {
  return members.some(member => 
    member.profile_id === profileId && member.role_in_group === 'admin'
  );
};

// Helper pour obtenir les membres d'un groupe spécifique
export const getWorkgroupMembers = (
  allMembers: WorkgroupMemberDetail[], 
  workgroupId: string
): WorkgroupMemberDetail[] => {
  return allMembers.filter(member => member.workgroup_id === workgroupId);
};

// Helper pour vérifier si un profil est membre d'un groupe
export const isProfileInWorkgroup = (
  members: WorkgroupMember[], 
  workgroupId: string, 
  profileId: string
): boolean => {
  return members.some(member => 
    member.workgroup_id === workgroupId && member.profile_id === profileId
  );
}; 