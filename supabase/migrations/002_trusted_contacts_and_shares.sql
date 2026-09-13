create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 320),
  consent_granted boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shared_incident_links (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz
);

create index if not exists trusted_contacts_user_idx on public.trusted_contacts(user_id, created_at desc);
create index if not exists shared_incident_links_token_idx on public.shared_incident_links(token_hash);
create index if not exists shared_incident_links_incident_idx on public.shared_incident_links(incident_id, created_at desc);

grant select, insert, update, delete on public.trusted_contacts, public.shared_incident_links to service_role, authenticated;
alter table public.trusted_contacts enable row level security;
alter table public.shared_incident_links enable row level security;
drop policy if exists "users manage own trusted contacts" on public.trusted_contacts;
drop policy if exists "users manage own shared links" on public.shared_incident_links;
create policy "users manage own trusted contacts" on public.trusted_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own shared links" on public.shared_incident_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
