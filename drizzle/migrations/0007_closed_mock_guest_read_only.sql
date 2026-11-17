CREATE OR REPLACE FUNCTION public.can_edit_session(_session uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.sessions s WHERE s.id = _session
   AND (s.host_id = _user OR (s.mode = 'mock' AND s.status = 'active' AND EXISTS (
     SELECT 1 FROM public.session_participants p WHERE p.session_id = s.id AND p.user_id = _user AND p.role = 'interviewee'
   )))
 );
$$;