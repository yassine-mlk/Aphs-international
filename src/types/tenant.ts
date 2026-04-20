// Types pour le système SaaS multi-tenant

export type TenantPlan = 'starter' | 'pro' | 'enterprise' | 'custom';
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';
export type TenantMemberRole = 'admin' | 'intervenant' | 'viewer';
export type TenantMemberStatus = 'pending' | 'active' | 'deactivated';

// Interface principale d'un tenant
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  
  // Contact
  ownerEmail: string;
  ownerUserId?: string;
  
  // Plan et limites
  plan: TenantPlan;
  maxProjects: number;
  maxIntervenants: number;
  maxStorageGb: number;
  
  // Utilisation actuelle
  currentProjectsCount: number;
  currentIntervenantsCount: number;
  currentStorageUsedBytes: number;
  
  // Statut
  status: TenantStatus;
  trialEndsAt?: string;
  subscriptionStartsAt?: string;
  subscriptionEndsAt?: string;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  settings: Record<string, any>;
  
  // Facturation
  billingEmail?: string;
  billingAddress?: string;
  taxId?: string;
}

// Interface pour les membres d'un tenant
export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantMemberRole;
  invitedBy?: string;
  invitedAt: string;
  joinedAt?: string;
  status: TenantMemberStatus;
  createdAt: string;
  updatedAt: string;
  
  // Jointures
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  invitedByUser?: {
    firstName: string;
    lastName: string;
  };
}

// Usage et quotas
export interface TenantUsage {
  projects: {
    used: number;
    limit: number;
    percentage: number;
  };
  intervenants: {
    used: number;
    limit: number;
    percentage: number;
  };
  storage: {
    usedBytes: number;
    limitBytes: number;
    usedGb: number;
    limitGb: number;
    percentage: number;
  };
}

// Contexte tenant pour l'application
export interface TenantContextType {
  // Tenant courant
  tenant: Tenant | null;
  member: TenantMember | null;
  isLoading: boolean;
  error: string | null;
  
  // Usage et quotas
  usage: TenantUsage;
  refreshUsage: () => Promise<void>;
  
  // Vérifications de quotas
  canAddProject: () => boolean;
  canAddIntervenant: () => boolean;
  canUploadFile: (sizeBytes: number) => boolean;
  getRemainingStorage: () => number;
  
  // Actions
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
}

// Données pour créer un tenant (Super Admin)
export interface CreateTenantData {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;  // ← AJOUTÉ: Mot de passe pour l'admin
  plan: TenantPlan;
  maxProjects?: number;
  maxIntervenants?: number;
  maxStorageGb?: number;
  trialDays?: number;
}

// Plans prédéfinis
export const TENANT_PLANS: { 
  value: TenantPlan; 
  label: string; 
  description: string;
  defaultLimits: {
    maxProjects: number;
    maxIntervenants: number;
    maxStorageGb: number;
  };
  price?: number;
}[] = [
  {
    value: 'starter',
    label: 'Starter',
    description: 'Parfait pour les petites équipes',
    defaultLimits: { maxProjects: 5, maxIntervenants: 10, maxStorageGb: 10 },
    price: 49
  },
  {
    value: 'pro',
    label: 'Pro',
    description: 'Pour les équipes en croissance',
    defaultLimits: { maxProjects: 20, maxIntervenants: 50, maxStorageGb: 100 },
    price: 149
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    description: 'Sans limites pour les grands comptes',
    defaultLimits: { maxProjects: 999, maxIntervenants: 999, maxStorageGb: 1000 },
    price: 499
  },
  {
    value: 'custom',
    label: 'Sur mesure',
    description: 'Limites personnalisées',
    defaultLimits: { maxProjects: 10, maxIntervenants: 20, maxStorageGb: 50 }
  }
];

// Helper pour obtenir les limites par défaut d'un plan
export const getPlanDefaults = (plan: TenantPlan) => {
  return TENANT_PLANS.find(p => p.value === plan)?.defaultLimits || TENANT_PLANS[0].defaultLimits;
};

// Helper pour formater la taille de stockage
export const formatStorage = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper pour formater le pourcentage
export const formatPercentage = (used: number, limit: number): number => {
  if (limit === 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
};
