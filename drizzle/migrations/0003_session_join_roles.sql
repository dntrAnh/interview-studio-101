CREATE OR REPLACE FUNCTION public.join_session_as(_session uuid, _role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE room public.sessions; existing_role text; role_count integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to join this room'; END IF;
 IF _role NOT IN ('interviewee', 'spectator') THEN RAISE EXCEPTION 'Choose interviewee or spectator'; END IF;
 SELECT * INTO room FROM public.sessions WHERE id = _session FOR UPDATE;
 IF NOT FOUND OR room.mode <> 'mock' OR room.status <> 'active' THEN RAISE EXCEPTION 'This mock interview is not available'; END IF;
 IF room.host_id = auth.uid() THEN RETURN; END IF;
 SELECT role INTO existing_role FROM public.session_participants WHERE session_id = _session AND user_id = auth.uid();
 IF existing_role IS NOT NULL THEN RETURN; END IF;
 SELECT count(*) INTO role_count FROM public.session_participants WHERE session_id = _session AND role = _role;
 IF _role = 'interviewee' AND role_count >= 1 THEN RAISE EXCEPTION 'The interviewee seat is taken. Join as a spectator instead.'; END IF;
 IF _role = 'spectator' AND role_count >= 5 THEN RAISE EXCEPTION 'All five spectator seats are taken.'; END IF;
 INSERT INTO public.session_participants(session_id,user_id,role) VALUES (_session,auth.uid(),_role);
END; $$;
REVOKE ALL ON FUNCTION public.join_session_as(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_session_as(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.join_session(_session uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.join_session_as(_session,'interviewee'); END; $$;
REVOKE ALL ON FUNCTION public.join_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_session(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.can_edit_session(_session uuid, _user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.sessions WHERE id=_session AND host_id=_user) OR EXISTS(SELECT 1 FROM public.session_participants WHERE session_id=_session AND user_id=_user AND role='interviewee'); $$;
REVOKE ALL ON FUNCTION public.can_edit_session(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_session(uuid,uuid) TO authenticated;
DROP POLICY "members update sessions" ON public.sessions;
CREATE POLICY "members update sessions" ON public.sessions FOR UPDATE TO authenticated USING(public.can_edit_session(id,auth.uid())) WITH CHECK(public.can_edit_session(id,auth.uid()));