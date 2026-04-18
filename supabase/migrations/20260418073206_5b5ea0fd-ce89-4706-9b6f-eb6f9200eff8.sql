-- Allow authenticated users to read questions from base tables.
-- Note: The _public views (security_invoker=on) already exclude the correct_answer column,
-- so the application reads from the views and never exposes the answer.
-- These policies are required so the views can return rows for non-admin users.

CREATE POLICY "Authenticated users can view aptitude questions"
ON public.aptitude_questions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view technical MCQ questions"
ON public.technical_mcq_questions
FOR SELECT
TO authenticated
USING (true);