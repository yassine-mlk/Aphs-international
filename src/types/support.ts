
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'general' | 'technical' | 'billing' | 'feature_request';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  admin_notes?: string;
  // Optionnel: infos utilisateur pour la vue admin
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface CreateTicketData {
  subject: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
}
