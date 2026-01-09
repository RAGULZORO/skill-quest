-- Create a new table for technical MCQ questions (similar to aptitude_questions)
CREATE TABLE public.technical_mcq_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.technical_mcq_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for technical MCQ questions
CREATE POLICY "Anyone can view technical MCQ questions" 
ON public.technical_mcq_questions 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can create technical MCQ questions" 
ON public.technical_mcq_questions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update technical MCQ questions" 
ON public.technical_mcq_questions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete technical MCQ questions" 
ON public.technical_mcq_questions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);