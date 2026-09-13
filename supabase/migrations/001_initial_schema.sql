create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  retention_days integer,
  analysis_history_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  source_type text not null check (source_type in ('message','screenshot','website')),
  category text not null,
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  risk_score integer not null check (risk_score between 0 and 100),
  summary text not null,
  explanation text not null,
  status text not null default 'OPEN' check (status in ('OPEN','REVIEWING','RESOLVED','ARCHIVED')),
  ai_provider text not null default 'gemini',
  analysis_version text not null default '1.0',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null unique references public.incidents(id) on delete cascade,
  category text not null,
  severity text not null,
  risk_score integer not null check (risk_score between 0 and 100),
  risk_dna jsonb not null default '{}'::jsonb,
  detected_signals jsonb not null default '[]'::jsonb,
  explanation text not null,
  possible_consequences jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  confidence integer not null default 0 check (confidence between 0 and 100),
  model_name text not null,
  analysis_version text not null default '1.0',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 8388608),
  sha256_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  captured_at timestamptz,
  evidence_type text not null default 'screenshot',
  description text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  description text not null,
  created_at timestamptz not null default timezone('utc', now()),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','UNDER_REVIEW','CLOSED'))
);

create table if not exists public.safety_actions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists incidents_user_created_idx on public.incidents(user_id, created_at desc);
create index if not exists evidence_incident_created_idx on public.evidence(incident_id, created_at desc);
create index if not exists reports_incident_created_idx on public.reports(incident_id, created_at desc);
create index if not exists incident_events_incident_created_idx on public.incident_events(incident_id, created_at asc);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.profiles, public.incidents, public.analysis_results, public.evidence, public.reports, public.safety_actions, public.incident_events to service_role;
grant select, insert, update, delete on public.profiles, public.incidents, public.analysis_results, public.evidence, public.reports, public.safety_actions, public.incident_events to authenticated;
grant usage, select on all sequences in schema public to service_role, authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.analysis_results enable row level security;
alter table public.evidence enable row level security;
alter table public.reports enable row level security;
alter table public.safety_actions enable row level security;
alter table public.incident_events enable row level security;

drop policy if exists "users manage own profile" on public.profiles;
drop policy if exists "users manage own incidents" on public.incidents;
drop policy if exists "users read own analysis" on public.analysis_results;
drop policy if exists "users manage own evidence" on public.evidence;
drop policy if exists "users manage own reports" on public.reports;
drop policy if exists "users manage own safety actions" on public.safety_actions;
drop policy if exists "users read own timeline" on public.incident_events;
create policy "users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users manage own incidents" on public.incidents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read own analysis" on public.analysis_results for select using (exists (select 1 from public.incidents i where i.id = incident_id and i.user_id = auth.uid()));
create policy "users manage own evidence" on public.evidence for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own reports" on public.reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own safety actions" on public.safety_actions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read own timeline" on public.incident_events for select using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('sentinel-evidence', 'sentinel-evidence', false, 8388608, array['image/png','image/jpeg','image/webp']) on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "users upload own evidence objects" on storage.objects;
drop policy if exists "users read own evidence objects" on storage.objects;
drop policy if exists "users delete own evidence objects" on storage.objects;
create policy "users upload own evidence objects" on storage.objects for insert to authenticated with check (bucket_id = 'sentinel-evidence' and split_part(name, '/', 2) = auth.uid()::text);
create policy "users read own evidence objects" on storage.objects for select to authenticated using (bucket_id = 'sentinel-evidence' and split_part(name, '/', 2) = auth.uid()::text);
create policy "users delete own evidence objects" on storage.objects for delete to authenticated using (bucket_id = 'sentinel-evidence' and split_part(name, '/', 2) = auth.uid()::text);
