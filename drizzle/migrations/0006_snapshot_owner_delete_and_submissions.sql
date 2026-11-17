GRANT DELETE ON public.snapshots TO authenticated;
CREATE POLICY "owners delete snapshots" ON public.snapshots FOR DELETE TO authenticated USING (owner_id=auth.uid());
ALTER TABLE public.sessions ADD COLUMN last_submission jsonb;
COMMENT ON COLUMN public.sessions.last_submission IS 'Latest explicitly submitted code, language, tests, runner output and submission timestamp.';