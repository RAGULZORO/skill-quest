CREATE POLICY "Admins can view all mock tests"
ON public.mock_tests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));