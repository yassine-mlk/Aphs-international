import { useTenant } from '../contexts/TenantContext';
import { PlanLimits } from '../types/tenant';

interface UsePlanReturn {
  plan: string;
  limits: PlanLimits | null;
  can: (feature: keyof PlanLimits | 'sequential') => boolean;
  isLoading: boolean;
}

export function usePlan(): UsePlanReturn {
  const { tenant, isLoading } = useTenant();

  const plan = tenant?.plan || 'starter';
  let limits = (tenant?.plan_limits as PlanLimits) || null;

  // Fallback si les limites ne sont pas en base pour les plans connus
  if (!limits && plan === 'business') {
    limits = {
      videoconference: true,
      groups: true,
      esignature: true,
      custom_structure: true,
      advanced_fiches: true,
      email_notifications: true,
      max_intervenants_per_project: 999,
      max_projects: 999,
      task_types: ['standard', 'sequential', 'parallel'],
      storage_per_project_gb: 100,
      max_file_size_gb: 2,
      api_access: true
    };
  } else if (!limits && plan === 'pro') {
    limits = {
      videoconference: true,
      groups: true,
      esignature: true,
      custom_structure: true,
      advanced_fiches: false,
      email_notifications: true,
      max_intervenants_per_project: 30,
      max_projects: 999,
      task_types: ['standard', 'sequential'],
      storage_per_project_gb: 50,
      max_file_size_gb: 1,
      api_access: false
    };
  }

  const can = (feature: keyof PlanLimits | 'sequential'): boolean => {
    if (!limits) return false;
    
    if (feature === 'sequential') {
      return limits.task_types.includes('sequential');
    }

    const value = limits[feature as keyof PlanLimits];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0; // -1 or any positive number
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  return { plan, limits, can, isLoading };
}
