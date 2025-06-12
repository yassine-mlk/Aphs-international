// Types pour les profils utilisateurs

export type UserRole = 'admin' | 'intervenant' | 'owner';
export type UserStatus = 'active' | 'inactive';
export type UserTheme = 'light' | 'dark';
export type UserLanguage = 'fr' | 'en' | 'es' | 'ar';

// Liste des spécialités disponibles (correspondant à celle du hook useSupabase)
export const SPECIALTIES = [
  'MOA Maître d\'ouvrage',
  'AMO Assistant maîtrise d\'ouvrage',
  'Géomètre',
  'MOE Maître d\'oeuvre',
  'Commission de sécurité',
  'Monuments historiques',
  'Elus locaux',
  'Futurs usagers',
  'Gestionnaire',
  'Programmiste',
  'Architectes',
  'Membres du Jury',
  'Bureau de contrôle',
  'Bureau d\'étude de sol',
  'Bureau d\'étude structure',
  'Bureau d\'étude thermique',
  'Bureau d\'étude acoustique',
  'Bureau d\'étude électricité',
  'Bureau d\'étude plomberie, chauffage, ventilation, climatisation',
  'Bureau d\'étude VRD voirie, réseaux divers',
  'Architecte d\'intérieur',
  'COORDINATEUR OPC',
  'COORDINATEUR SPS',
  'COORDINATEUR SSI'
];

// Interface principale pour un profil
export interface Profile {
  id: string; // Mapped from user_id for consistency with frontend code
  user_id: string; // Primary key in database
  first_name: string;
  last_name: string;
  name: string; // Généré automatiquement en base
  email: string;
  phone?: string;
  role: UserRole;
  specialty?: string;
  company: string;
  company_id?: string;
  status: UserStatus;
  bio?: string;
  theme: UserTheme;
  language: UserLanguage;
  // Préférences de notifications
  email_notifications: boolean;
  push_notifications: boolean;
  message_notifications: boolean;
  update_notifications: boolean;
  created_at: string;
  updated_at: string;
}

// Interface pour les données du formulaire de création de profil
export interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  specialty?: string;
  company: string;
  company_id?: string;
  bio?: string;
  theme?: UserTheme;
  language?: UserLanguage;
}

// Interface pour les données du formulaire d'édition de profil
export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  specialty?: string;
  company?: string;
  company_id?: string;
  status?: UserStatus;
  bio?: string;
  theme?: UserTheme;
  language?: UserLanguage;
  email_notifications?: boolean;
  push_notifications?: boolean;
  message_notifications?: boolean;
  update_notifications?: boolean;
}

// Interface pour les préférences de notifications
export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  message_notifications: boolean;
  update_notifications: boolean;
}

// Interface pour les filtres de recherche de profils
export interface ProfileFilters {
  role?: UserRole;
  status?: UserStatus;
  specialty?: string;
  company_id?: string;
  language?: UserLanguage;
}

// Interface pour les options de tri
export interface ProfileSortOptions {
  field: 'name' | 'created_at' | 'specialty' | 'company' | 'role';
  direction: 'asc' | 'desc';
}

// Interface pour la création d'un profil depuis le formulaire d'intervenant
export interface IntervenantFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string; // Pour la création du compte auth
  phone?: string;
  specialty: string;
  company: string;
  company_id?: string;
  role?: UserRole; // Déterminé automatiquement selon la spécialité
}

// Options pour les dropdowns
export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'intervenant', label: 'Intervenant' },
  { value: 'owner', label: 'Propriétaire' }
];

export const USER_STATUSES: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' }
];

export const USER_THEMES: { value: UserTheme; label: string }[] = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' }
];

export const USER_LANGUAGES: { value: UserLanguage; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'ar', label: 'العربية' }
];

// Helper pour déterminer le rôle selon la spécialité
export const getRoleFromSpecialty = (specialty: string): UserRole => {
  if (specialty === 'MOA Maître d\'ouvrage') {
    return 'owner';
  }
  return 'intervenant';
};

// Helper pour obtenir le nom complet
export const getFullName = (profile: Profile): string => {
  return profile.name || `${profile.first_name} ${profile.last_name}`;
};

// Helper pour vérifier si un profil est actif
export const isActiveProfile = (profile: Profile): boolean => {
  return profile.status === 'active';
}; 