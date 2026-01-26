-- Fix security definer view warning by explicitly setting SECURITY INVOKER
-- Note: Views use SECURITY INVOKER by default, but we'll recreate them with explicit setting

DROP VIEW IF EXISTS public.aptitude_questions_public;
DROP VIEW IF EXISTS public.technical_mcq_questions_public;

-- Recreate views with explicit SECURITY INVOKER
CREATE VIEW public.aptitude_questions_public 
WITH (security_invoker = true) AS
SELECT id, question, options, explanation, category, level, created_at, created_by
FROM public.aptitude_questions;

CREATE VIEW public.technical_mcq_questions_public 
WITH (security_invoker = true) AS
SELECT id, question, options, explanation, category, level, created_at, created_by
FROM public.technical_mcq_questions;

-- Regrant permissions
GRANT SELECT ON public.aptitude_questions_public TO authenticated;
GRANT SELECT ON public.aptitude_questions_public TO anon;
GRANT SELECT ON public.technical_mcq_questions_public TO authenticated;
GRANT SELECT ON public.technical_mcq_questions_public TO anon;