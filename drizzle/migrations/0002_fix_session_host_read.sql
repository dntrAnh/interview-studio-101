DROP POLICY IF EXISTS "members read sessions" ON public.sessions;
CREATE POLICY "members read sessions" ON public.sessions FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR public.is_session_member(id, auth.uid()));
DROP POLICY IF EXISTS "members update sessions" ON public.sessions;
CREATE POLICY "members update sessions" ON public.sessions FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR public.is_session_member(id, auth.uid()));