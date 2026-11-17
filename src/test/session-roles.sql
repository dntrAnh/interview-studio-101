BEGIN;
DO $$
DECLARE room_id uuid := gen_random_uuid(); host_id uuid := gen_random_uuid(); guest_id uuid; blocked boolean;
BEGIN
INSERT INTO public.sessions(id,host_id,mode,status) VALUES(room_id,host_id,'mock','active');
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
PERFORM public.join_session_as(room_id,'interviewee');
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
blocked := false;
BEGIN PERFORM public.join_session_as(room_id,'interviewee'); EXCEPTION WHEN OTHERS THEN blocked := SQLERRM LIKE '%seat is taken%'; END;
IF NOT blocked THEN RAISE EXCEPTION 'Expected maximum one interviewee'; END IF;
FOR i IN 1..5 LOOP
 guest_id := gen_random_uuid(); PERFORM set_config('request.jwt.claim.sub',guest_id::text,true);
 PERFORM public.join_session_as(room_id,'spectator');
 IF public.can_edit_session(room_id,guest_id) THEN RAISE EXCEPTION 'Spectator must not edit'; END IF;
END LOOP;
IF (SELECT count(*) FROM public.session_participants WHERE session_id=room_id AND role='spectator') <> 5 THEN RAISE EXCEPTION 'Expected five spectators'; END IF;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
blocked := false;
BEGIN PERFORM public.join_session_as(room_id,'spectator'); EXCEPTION WHEN OTHERS THEN blocked := SQLERRM LIKE '%five spectator seats%'; END;
IF NOT blocked THEN RAISE EXCEPTION 'Expected maximum five spectators'; END IF;
blocked := false;
BEGIN UPDATE public.sessions SET status='archived' WHERE id=room_id; EXCEPTION WHEN OTHERS THEN blocked := SQLERRM LIKE '%Only the host%'; END;
IF NOT blocked THEN RAISE EXCEPTION 'Guest must not archive'; END IF;
PERFORM set_config('request.jwt.claim.sub',host_id::text,true);
UPDATE public.sessions SET status='archived' WHERE id=room_id;
IF (SELECT status FROM public.sessions WHERE id=room_id) <> 'archived' THEN RAISE EXCEPTION 'Host must archive'; END IF;
END $$;
ROLLBACK;
