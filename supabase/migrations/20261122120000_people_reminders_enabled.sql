-- ============================================================================
-- Geschenke-Manager: Pro-Person-Schalter fuer E-Mail-Erinnerungen (A6/A7, #3)
-- ============================================================================
-- Ausführliche Erklärung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

alter table public.people
  add column reminders_enabled boolean not null default true;

comment on column public.people.reminders_enabled is
  'Ob diese Person in E-Mail-Erinnerungen (Geburtstag/Weihnachten, A6/A7) auftaucht. Default true, damit sich für bestehende Personen nichts automatisch ändert.';
