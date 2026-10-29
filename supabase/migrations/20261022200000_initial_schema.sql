-- ============================================================================
-- Geschenke-Manager: initiales Datenbank-Schema
-- ============================================================================
-- Ausführliche Erklärung jeder Entscheidung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- people: Personen, für die Geschenke geplant/dokumentiert werden
-- ============================================================================
create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  birthday date,
  notes text,
  share_token uuid unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.people is
  'Personen, für die der/die Nutzer:in Geschenke plant oder dokumentiert.';
comment on column public.people.birthday is
  'Geburtstag der Person; Jahr optional relevant, wird für Monats-Erinnerungen ausgewertet.';
comment on column public.people.share_token is
  'Öffentlicher Token für das Teilen-per-Link-Feature (Geschenkideen dieser Person).';

-- ============================================================================
-- occasions: Anlässe für Geschenke (Weihnachten, Geburtstag, frei erstellbar)
-- ============================================================================
create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

comment on table public.occasions is
  'Anlässe für Geschenke. "Weihnachten" und "Geburtstag" werden pro Nutzer:in automatisch angelegt, weitere sind frei erstellbar.';

-- ============================================================================
-- gifts: Geschenkideen UND bereits gegebene Geschenke
-- ============================================================================
-- status unterscheidet den Lebenszyklus: idea -> purchased -> given
-- ("Umwandlung Idee -> Geschenk" = status/occasion_id/gift_date aktualisieren)
create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  occasion_id uuid references public.occasions (id) on delete set null,
  title text not null,
  description text,
  link text,
  image_url text,
  status text not null default 'idea'
    check (status in ('idea', 'purchased', 'given')),
  open_tasks text,
  gift_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gifts is
  'Geschenkideen und tatsächlich gegebene Geschenke. status: idea (Idee) -> purchased (besorgt) -> given (überreicht).';
comment on column public.gifts.open_tasks is
  'Freitext für offene Aufgaben zu dieser Idee (z. B. "noch bestellen", "verpacken").';
comment on column public.gifts.image_url is
  'Verweis auf eine Datei in Supabase Storage (Bucket "gift-images"), nicht das Bild selbst.';

-- ============================================================================
-- updated_at automatisch aktuell halten
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

create trigger gifts_set_updated_at
  before update on public.gifts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Indizes für die häufigsten Abfragen (Filter/Join nach user_id, person_id)
-- ============================================================================
create index people_user_id_idx on public.people (user_id);
create index occasions_user_id_idx on public.occasions (user_id);
create index gifts_user_id_idx on public.gifts (user_id);
create index gifts_person_id_idx on public.gifts (person_id);
create index gifts_occasion_id_idx on public.gifts (occasion_id);

-- ============================================================================
-- Row Level Security: jede:r Nutzer:in sieht/ändert ausschließlich eigene Daten
-- ============================================================================
alter table public.people enable row level security;
alter table public.occasions enable row level security;
alter table public.gifts enable row level security;

create policy "people_select_own" on public.people
  for select using (auth.uid() = user_id);
create policy "people_insert_own" on public.people
  for insert with check (auth.uid() = user_id);
create policy "people_update_own" on public.people
  for update using (auth.uid() = user_id);
create policy "people_delete_own" on public.people
  for delete using (auth.uid() = user_id);

create policy "occasions_select_own" on public.occasions
  for select using (auth.uid() = user_id);
create policy "occasions_insert_own" on public.occasions
  for insert with check (auth.uid() = user_id);
create policy "occasions_update_own" on public.occasions
  for update using (auth.uid() = user_id);
create policy "occasions_delete_own" on public.occasions
  for delete using (auth.uid() = user_id);

create policy "gifts_select_own" on public.gifts
  for select using (auth.uid() = user_id);
create policy "gifts_insert_own" on public.gifts
  for insert with check (auth.uid() = user_id);
create policy "gifts_update_own" on public.gifts
  for update using (auth.uid() = user_id);
create policy "gifts_delete_own" on public.gifts
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- Standard-Anlässe automatisch für neue Nutzer:innen anlegen
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.occasions (user_id, name)
  values
    (new.id, 'Weihnachten'),
    (new.id, 'Geburtstag');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
