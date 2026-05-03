-- Migration: Add missing columns to conversations for dashboard statistics
-- Added on 2026-05-03

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_sender_id UUID REFERENCES auth.users(id);

-- Update existing conversations with data from last message
DO $$
BEGIN
    UPDATE public.conversations c
    SET 
        last_message_at = m.created_at,
        last_sender_id = m.sender_id
    FROM (
        SELECT DISTINCT ON (conversation_id) conversation_id, created_at, sender_id
        FROM public.messages
        ORDER BY conversation_id, created_at DESC
    ) m
    WHERE c.id = m.conversation_id;
END $$;

-- Update the trigger function to sync these columns
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET 
        updated_at = NEW.created_at,
        last_message_at = NEW.created_at,
        last_sender_id = NEW.sender_id
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
