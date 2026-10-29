-- ============================================================================
-- Geschenke-Manager: Geburtstag (Jahr optional), Interessen-Tags, Teilen-Links
-- ============================================================================
-- Ausführliche Erklärung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

-- ============================================================================
-- people: birthday (date) -> Tag/Monat getrennt (Pflicht), Jahr optional (A1)
-- ============================================================================
alter table public.people
  add column birthday_day smallint check (birthday_day between 1 and 31),
  add column birthday_month smallint check (birthday_month between 1 and 12),
  add column birthday_year smallint check (birthday_year between 1900 and 2100),
  add column interests text[] not null default '{}';

update public.people
set birthday_day = extract(day from birthday)::smallint,
    birthday_month = extract(month from birthday)::smallint,
    birthday_year = extract(year from birthday)::smallint
where birthday is not null;

alter table public.people drop column birthday;
alter table public.people drop column share_token;

comment on column public.people.birthday_day is
  'Tag des Geburtstags (1-31). Zusammen mit birthday_month Pflicht, sobald ein Geburtstag angegeben wird.';
comment on column public.people.birthday_month is
  'Monat des Geburtstags (1-12).';
comment on column public.people.birthday_year is
  'Geburtsjahr, optional (Datensparsamkeit, siehe QA7/DSGVO).';
comment on column public.people.interests is
  'Interessen als freie Tags, Grundlage für die regelbasierten Vorschläge (A12).';

alter table public.people
  add constraint birthday_day_month_together
  check ((birthday_day is null) = (birthday_month is null));

-- ============================================================================
-- gifts: Aufgaben-Freitextfeld entfernen (A4 Stufe 3 braucht eine strukturierte
-- abhakbare Liste, kein Freitext -> eigene Tabelle folgt mit Stufe 3)
-- ============================================================================
alter table public.gifts drop column open_tasks;

-- ============================================================================
-- shared_links / shared_link_people: Teilen-per-Link (A10, schon im MVP)
-- ============================================================================
create table public.shared_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

comment on table public.shared_links is
  'Ein erstellter Freigabe-Link. "Widerrufen" = Zeile löschen, siehe A10.';
comment on column public.shared_links.token is
  'Nicht erratbarer, öffentlicher Teil der URL (/teilen/<token>). UUID v4, 122 Bit Zufall.';

create table public.shared_link_people (
  shared_link_id uuid not null references public.shared_links (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (shared_link_id, person_id)
);

comment on table public.shared_link_people is
  'Welche Personen ein Freigabe-Link zeigt (mehrere Personen pro Link möglich).';

create index shared_links_user_id_idx on public.shared_links (user_id);
create index shared_link_people_person_id_idx on public.shared_link_people (person_id);

alter table public.shared_links enable row level security;
alter table public.shared_link_people enable row level security;

-- Nur die eigenen Links verwalten. Das öffentliche Lesen über den Token läuft
-- NICHT über RLS, sondern über einen serverseitigen Service-Role-Zugriff in
-- der Teilen-Route (der Token selbst ist das Zugriffsrecht, siehe A10/QA6) -
-- RLS kann "gehört dieser Token zu dieser Zeile" nicht sauber für anonyme
-- Zugriffe abbilden, ohne den Token clientseitig als Session-Variable zu
-- übergeben.
create policy "shared_links_select_own" on public.shared_links
  for select using (auth.uid() = user_id);
create policy "shared_links_insert_own" on public.shared_links
  for insert with check (auth.uid() = user_id);
create policy "shared_links_delete_own" on public.shared_links
  for delete using (auth.uid() = user_id);

create policy "shared_link_people_select_own" on public.shared_link_people
  for select using (
    exists (
      select 1 from public.shared_links sl
      where sl.id = shared_link_people.shared_link_id and sl.user_id = auth.uid()
    )
  );
create policy "shared_link_people_insert_own" on public.shared_link_people
  for insert with check (
    exists (
      select 1 from public.shared_links sl
      where sl.id = shared_link_people.shared_link_id and sl.user_id = auth.uid()
    )
  );
create policy "shared_link_people_delete_own" on public.shared_link_people
  for delete using (
    exists (
      select 1 from public.shared_links sl
      where sl.id = shared_link_people.shared_link_id and sl.user_id = auth.uid()
    )
  );
