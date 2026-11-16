create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed in" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null default 'Untitled question',
  difficulty text not null default 'Medium',
  description text not null default '',
  hints jsonb not null default '[]'::jsonb,
  complexity text not null default '',
  starter_code jsonb not null default '{}'::jsonb,
  test_cases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.questions to authenticated;
grant all on public.questions to service_role;
alter table public.questions enable row level security;
create policy "own questions" on public.questions for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null,
  mode text not null default 'solo',
  title text not null default '',
  question jsonb not null default '{}'::jsonb,
  code text not null default '',
  language text not null default 'python',
  hints_visible boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;

create table public.session_participants (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'interviewee',
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
grant select, insert, delete on public.session_participants to authenticated;
grant all on public.session_participants to service_role;

create or replace function public.is_session_member(_session uuid, _user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sessions s where s.id = _session and s.host_id = _user)
      or exists (select 1 from public.session_participants p where p.session_id = _session and p.user_id = _user);
$$;

create or replace function public.join_session(_session uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.sessions where id = _session and mode = 'mock') then
    raise exception 'session not found';
  end if;
  insert into public.session_participants (session_id, user_id, role)
  values (_session, auth.uid(), 'interviewee') on conflict do nothing;
end; $$;
grant execute on function public.join_session(uuid) to authenticated;

alter table public.sessions enable row level security;
create policy "members read sessions" on public.sessions for select to authenticated using (public.is_session_member(id, auth.uid()));
create policy "host creates sessions" on public.sessions for insert to authenticated with check (auth.uid() = host_id);
create policy "members update sessions" on public.sessions for update to authenticated using (public.is_session_member(id, auth.uid()));
create policy "host deletes sessions" on public.sessions for delete to authenticated using (auth.uid() = host_id);

alter table public.session_participants enable row level security;
create policy "members read participants" on public.session_participants for select to authenticated using (public.is_session_member(session_id, auth.uid()));
create policy "leave session" on public.session_participants for delete to authenticated using (auth.uid() = user_id);

create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete set null,
  owner_id uuid not null,
  title text not null default '',
  data jsonb not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.snapshots to authenticated;
grant all on public.snapshots to service_role;
alter table public.snapshots enable row level security;
create policy "read own or session snapshots" on public.snapshots for select to authenticated
  using (auth.uid() = owner_id or (session_id is not null and public.is_session_member(session_id, auth.uid())));
create policy "create own snapshots" on public.snapshots for insert to authenticated
  with check (auth.uid() = owner_id and (session_id is null or public.is_session_member(session_id, auth.uid())));