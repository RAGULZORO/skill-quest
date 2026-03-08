-- Allow admins to read all user profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all user progress
CREATE POLICY "Admins can view all user progress"
ON public.user_progress
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));