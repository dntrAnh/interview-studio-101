CREATE TABLE public.session_history (
 session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (session_id, user_id)
);
GRANT SELECT ON public.session_history TO authenticated;
GRANT ALL ON public.session_history TO service_role;
ALTER TABLE public.session_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own room history" ON public.session_history FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.session_history (session_id,user_id) SELECT session_id,user_id FROM public.session_participants ON CONFLICT DO NOTHING;
CREATE FUNCTION public.remember_joined_session() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.session_history(session_id,user_id) VALUES(NEW.session_id,NEW.user_id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER remember_joined_session AFTER INSERT ON public.session_participants FOR EACH ROW EXECUTE FUNCTION public.remember_joined_session();
CREATE FUNCTION public.has_session_access(_session uuid, _user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_session_member(_session,_user) OR EXISTS(SELECT 1 FROM public.session_history WHERE session_id=_session AND user_id=_user); $$;
REVOKE ALL ON FUNCTION public.has_session_access(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_session_access(uuid,uuid) TO authenticated;
CREATE POLICY "past participants read saved rooms" ON public.sessions FOR SELECT TO authenticated USING (public.has_session_access(id,auth.uid()));
CREATE TABLE public.session_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
 author_id uuid NOT NULL,
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.session_feedback TO authenticated;
GRANT ALL ON public.session_feedback TO service_role;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room members read feedback" ON public.session_feedback FOR SELECT TO authenticated USING (public.has_session_access(session_id,auth.uid()));
CREATE POLICY "mock interviewer posts feedback" ON public.session_feedback FOR INSERT TO authenticated WITH CHECK (author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.sessions WHERE id=session_id AND mode='mock' AND host_id=auth.uid()));
CREATE INDEX session_feedback_room_time ON public.session_feedback(session_id,created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_feedback;