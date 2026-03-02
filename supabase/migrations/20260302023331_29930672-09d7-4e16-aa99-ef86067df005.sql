
-- Add youtube_url column to gd_topics
ALTER TABLE public.gd_topics ADD COLUMN youtube_url text DEFAULT NULL;

-- Create gd_user_notes table
CREATE TABLE public.gd_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.gd_topics(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  confidence_level integer DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.gd_user_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own rows
CREATE POLICY "Users can view their own gd notes"
  ON public.gd_user_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gd notes"
  ON public.gd_user_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gd notes"
  ON public.gd_user_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gd notes"
  ON public.gd_user_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE TRIGGER update_gd_user_notes_updated_at
  BEFORE UPDATE ON public.gd_user_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
