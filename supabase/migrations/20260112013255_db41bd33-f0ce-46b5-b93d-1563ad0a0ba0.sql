-- Security fix: Protect correct answers from being exposed to students
-- Create public views that exclude correct_answer field for student access

-- Create secure view for aptitude questions (without correct_answer)
CREATE OR REPLACE VIEW public.aptitude_questions_public AS
SELECT id, question, options, explanation, category, level, created_at, created_by
FROM public.aptitude_questions;

-- Create secure view for technical MCQ questions (without correct_answer)
CREATE OR REPLACE VIEW public.technical_mcq_questions_public AS
SELECT id, question, options, explanation, category, level, created_at, created_by
FROM public.technical_mcq_questions;

-- Grant SELECT on the public views to authenticated and anon roles
GRANT SELECT ON public.aptitude_questions_public TO authenticated;
GRANT SELECT ON public.aptitude_questions_public TO anon;
GRANT SELECT ON public.technical_mcq_questions_public TO authenticated;
GRANT SELECT ON public.technical_mcq_questions_public TO anon;

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view aptitude questions" ON public.aptitude_questions;
DROP POLICY IF EXISTS "Anyone can view technical MCQ questions" ON public.technical_mcq_questions;

-- Create new restrictive policies - only admins can view the full table (with correct_answer)
CREATE POLICY "Admins can view all aptitude questions" 
ON public.aptitude_questions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all technical MCQ questions" 
ON public.technical_mcq_questions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));