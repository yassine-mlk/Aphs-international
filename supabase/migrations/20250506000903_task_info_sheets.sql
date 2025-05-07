-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create task_info_sheets table
CREATE TABLE IF NOT EXISTS public.task_info_sheets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phase_id VARCHAR(50) NOT NULL, -- "conception" or "realisation"
    section_id VARCHAR(10) NOT NULL, -- "A", "B", "C", etc.
    subsection_id VARCHAR(10) NOT NULL, -- "A1", "A2", "B1", etc.
    task_name TEXT NOT NULL,
    info_sheet TEXT NOT NULL, -- Le contenu de la fiche informative
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create a unique constraint to prevent duplicate info sheets
CREATE UNIQUE INDEX idx_unique_task_info_sheet ON public.task_info_sheets(phase_id, section_id, subsection_id, task_name);

-- Trigger for updating updated_at automatically
CREATE OR REPLACE FUNCTION update_task_info_sheets_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_info_sheets_modtime
BEFORE UPDATE ON public.task_info_sheets
FOR EACH ROW
EXECUTE FUNCTION update_task_info_sheets_modtime();

-- Row Level Security (RLS)
ALTER TABLE public.task_info_sheets ENABLE ROW LEVEL SECURITY;

-- Policy for viewing task info sheets (all authenticated users)
CREATE POLICY "All authenticated users can view task info sheets" 
ON public.task_info_sheets
FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- Policy for creating/updating task info sheets (admin only)
CREATE POLICY "Only admins can create or update task info sheets" 
ON public.task_info_sheets
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE 
            profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
    )
); 