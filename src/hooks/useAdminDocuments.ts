import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/components/ui/use-toast';

export interface AdminPendingDocument {
  id: string;
  document_id: string;
  document_name: string;
  document_description?: string;
  file_url: string;
  file_name: string;
  project_id: string;
  project_name: string;
  recipient_id: string;
  recipient_name: string;
  recipient_email: string;
  uploaded_by_name: string;
  uploaded_at: string;
  status: 'pending' | 'signed' | 'rejected';
  signed_at?: string;
}

export function useAdminDocuments() {
  const [pendingDocs, setPendingDocs] = useState<AdminPendingDocument[]>([]);
  const [signedDocs, setSignedDocs] = useState<AdminPendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, status } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    if (status !== 'authenticated' || !user?.id || !tenant?.id) return;

    try {
      setLoading(true);
      
      // Récupérer tous les documents avec leurs destinataires du tenant actuel
      const { data: recipients, error: recipientsError } = await supabase
        .from('document_recipients')
        .select(`
          id,
          document_id,
          user_id,
          user_name,
          user_email,
          status,
          signed_at,
          project_documents!inner(
            id,
            name,
            description,
            file_url,
            file_name,
            project_id,
            tenant_id,
            uploaded_by_name,
            created_at
          )
        `)
        .eq('project_documents.tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (recipientsError) throw recipientsError;

      if (!recipients || recipients.length === 0) {
        setPendingDocs([]);
        setSignedDocs([]);
        return;
      }

      const typedRecipients = recipients as any[];

      // Récupérer les noms des projets
      const projectIds = [
        ...new Set(
          typedRecipients
            .map(r => r?.project_documents?.project_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      ];
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      if (projectsError) throw projectsError;

      const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);

      // Formatter les données
      const formattedDocs: AdminPendingDocument[] = typedRecipients.map((r: any) => ({
        id: r.id,
        document_id: r.document_id,
        document_name: r.project_documents.name,
        document_description: r.project_documents.description,
        file_url: r.project_documents.file_url,
        file_name: r.project_documents.file_name,
        project_id: r.project_documents.project_id,
        project_name: projectMap.get(r.project_documents.project_id) || 'Projet inconnu',
        recipient_id: r.user_id,
        recipient_name: r.user_name,
        recipient_email: r.user_email,
        uploaded_by_name: r.project_documents.uploaded_by_name,
        uploaded_at: r.project_documents.created_at,
        status: r.status,
        signed_at: r.signed_at
      }));

      setPendingDocs(formattedDocs.filter(d => d.status === 'pending'));
      setSignedDocs(formattedDocs.filter(d => d.status !== 'pending'));
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [status, user?.id, tenant?.id, toast]);

  // Souscription temps réel
  useEffect(() => {
    if (status !== 'authenticated' || !user?.id || !tenant?.id) return;

    fetchDocuments();

    const channel = supabase
      .channel('admin-documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_recipients'
        },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status, user?.id, fetchDocuments]);

  return {
    pendingDocs,
    signedDocs,
    loading,
    pendingCount: pendingDocs.length,
    fetchDocuments
  };
}
