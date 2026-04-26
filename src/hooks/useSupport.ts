
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SupportTicket, CreateTicketData, TicketStatus } from '@/types/support';
import { useToast } from '@/components/ui/use-toast';

export const useSupport = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const getMyTickets = useCallback(async (): Promise<SupportTicket[]> => {
    if (!user) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos tickets de support.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const getAllTickets = useCallback(async (): Promise<SupportTicket[]> => {
    setLoading(true);
    try {
      // On récupère aussi les infos des profils pour l'admin
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          user:profiles(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching all tickets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger tous les tickets.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createTicket = async (data: CreateTicketData): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert([
          {
            ...data,
            user_id: user.id,
            status: 'open'
          }
        ]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Votre ticket a été créé avec succès. Notre équipe vous répondra bientôt.",
      });
      return true;
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le ticket.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus, adminNotes?: string): Promise<boolean> => {
    setLoading(true);
    try {
      const updates: any = { status };
      if (adminNotes !== undefined) updates.admin_notes = adminNotes;
      if (status === 'resolved') updates.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le statut du ticket a été mis à jour.",
      });
      return true;
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le ticket.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getMyTickets,
    getAllTickets,
    createTicket,
    updateTicketStatus
  };
};
