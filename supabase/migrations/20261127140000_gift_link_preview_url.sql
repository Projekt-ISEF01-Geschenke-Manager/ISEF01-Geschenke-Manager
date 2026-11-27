-- ============================================================================
-- Geschenke-Manager: Spalte fuer automatische Link-Vorschau (A8, #223)
-- ============================================================================
-- Ausführliche Erklärung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

alter table public.gifts
  add column link_preview_url text;

comment on column public.gifts.link_preview_url is
  'Automatisch ermitteltes Vorschaubild (og:image) der in "link" hinterlegten Seite - nur die externe Bild-URL (Hotlink), keine eigene Kopie. Null, wenn kein Link gesetzt ist oder keine Vorschau ermittelt werden konnte.';
