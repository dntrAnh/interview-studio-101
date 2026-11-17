DROP POLICY IF EXISTS "profiles readable by signed in" ON public.profiles;
CREATE POLICY "read own or co-session profiles" ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.user_id = profiles.id AND public.is_session_member(sp.session_id, auth.uid())
  )
);