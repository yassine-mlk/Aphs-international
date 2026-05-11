import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

export type AuditActionType = 
  | 'CREATE_TENANT'
  | 'DELETE_TENANT'
  | 'UPDATE_PLAN'
  | 'CREATE_PROJECT'
  | 'DELETE_PROJECT'
  | 'ADD_USER'
  | 'REMOVE_USER'
  | 'UPDATE_USER_ROLE'
  | 'UPLOAD_DOCUMENT'
  | 'DELETE_DOCUMENT'
  | 'SIGN_DOCUMENT'
  | 'OTHER';

export type AuditEntityType = 
  | 'tenant'
  | 'project'
  | 'user'
  | 'document'
  | 'task'
  | 'other';

export function useAudit() {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const logAction = useCallback(async (
    actionType: AuditActionType,
    entityType: AuditEntityType,
    entityId?: string,
    details?: Record<string, any>
  ) => {
    try {
      // On utilise le RPC pour insérer le log de manière sécurisée
      const { error } = await supabase.rpc('log_audit_action', {
        p_tenant_id: tenant?.id || null,
        p_action_type: actionType,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_details: details || {}
      });

      if (error) {
        console.error('Failed to log audit action:', error);
      }
    } catch (err) {
      console.error('Exception while logging audit action:', err);
    }
  }, [tenant?.id]);

  return { logAction };
}
