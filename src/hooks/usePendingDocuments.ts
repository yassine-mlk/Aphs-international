import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export interface PendingDocument {
  id: string;
  document_id: string;
  document_name: string;
  document_description?: string;
  file_url: string;
  file_name: string;
  project_id: string;
  project_name: string;
  uploaded_by_name: string;
  uploaded_at: string;
  status: 'pending' | 'signed' | 'rejected';
}

export function usePendingDocuments() {
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
  const [signedDocs, setSignedDocs] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPendingDocuments = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Récupérer tous les documents pour cet utilisateur
      const { data: recipients, error: recipientsError } = await supabase
        .from('document_recipients')
        .select(`
          id,
          document_id,
          status,
          signed_at,
          project_documents!inner(
            id,
            name,
            description,
            file_url,
            file_name,
            project_id,
            uploaded_by_name,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (recipientsError) throw recipientsError;

      if (!recipients || recipients.length === 0) {
        setPendingDocs([]);
        setSignedDocs([]);
        return;
      }

      // Récupérer les noms des projets
      const projectIds = [...new Set(recipients.map(r => r.project_documents.project_id))];
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      if (projectsError) throw projectsError;

      const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);

      // Formatter les données
      const formattedDocs: PendingDocument[] = recipients.map(r => ({
        id: r.id,
        document_id: r.document_id,
        document_name: r.project_documents.name,
        document_description: r.project_documents.description,
        file_url: r.project_documents.file_url,
        file_name: r.project_documents.file_name,
        project_id: r.project_documents.project_id,
        project_name: projectMap.get(r.project_documents.project_id) || 'Projet inconnu',
        uploaded_by_name: r.project_documents.uploaded_by_name,
        signed_at: r.signed_at,
        uploaded_at: r.project_documents.created_at,
        status: r.status
      }));

      setPendingDocs(formattedDocs.filter(d => d.status === 'pending'));
      setSignedDocs(formattedDocs.filter(d => d.status !== 'pending'));
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents en attente',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  // Souscription temps réel aux changements
  useEffect(() => {
    if (!user?.id) return;

    fetchPendingDocuments();

    const channel = supabase
      .channel('pending-documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_recipients',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchPendingDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchPendingDocuments]);

  // Signer un document
  const signDocument = useCallback(async (recipientId: string, comment?: string) => {
    try {
      // Récupérer les infos du document avant de le signer
      const { data: recipientData, error: fetchError } = await supabase
        .from('document_recipients')
        .select(`
          id,
          document_id,
          project_documents(id, name, project_id, uploaded_by)
        `)
        .eq('id', recipientId)
        .single();

      if (fetchError) throw fetchError;

      // Mettre à jour le statut
      const { error } = await supabase
        .from('document_recipients')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          comment: comment || null
        })
        .eq('id', recipientId);

      if (error) throw error;

      // Envoyer une notification à l'admin
      if (recipientData?.project_documents?.uploaded_by) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: recipientData.project_documents.uploaded_by,
            type: 'document_signed',
            title: 'Document signé',
            message: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''} a signé le document "${recipientData.project_documents.name}"`,
            data: {
              documentId: recipientData.document_id,
              projectId: recipientData.project_documents.project_id,
              signerName: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
              documentName: recipientData.project_documents.name
            },
            read: false
          });


        // Envoyer un email à l'admin via Edge Function
        try {
          await supabase.functions.invoke('send-document-signed-email', {
            body: {
              adminId: recipientData.project_documents.uploaded_by,
              documentName: recipientData.project_documents.name,
              signerName: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
              projectId: recipientData.project_documents.project_id,
              comment: comment
            }
          });
        } catch (emailError) {
        }
      }

      toast({
        title: 'Document signé',
        description: 'Le document a été signé avec succès'
      });

      // Rafraîchir la liste
      fetchPendingDocuments();
      
      return true;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de signer le document',
        variant: 'destructive'
      });
      return false;
    }
  }, [fetchPendingDocuments, toast, user]);

  // Refuser un document
  const rejectDocument = useCallback(async (recipientId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('document_recipients')
        .update({
          status: 'rejected',
          signed_at: new Date().toISOString(),
          comment: reason
        })
        .eq('id', recipientId);

      if (error) throw error;

      toast({
        title: 'Document refusé',
        description: 'Le document a été marqué comme refusé'
      });

      fetchPendingDocuments();
      
      return true;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de refuser le document',
        variant: 'destructive'
      });
      return false;
    }
  }, [fetchPendingDocuments, toast]);

  return {
    pendingDocs,
    signedDocs,
    loading,
    count: pendingDocs.length,
    fetchPendingDocuments,
    signDocument,
    rejectDocument
  };
}
