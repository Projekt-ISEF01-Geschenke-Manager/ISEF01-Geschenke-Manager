-- ============================================================================
-- Geschenke-Manager: Wer hat's besorgt? (geteilte Ansicht, A10)
-- ============================================================================
-- Ausführliche Erklärung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

-- Der geteilte Link ist anonym (kein Konto nötig) - wenn mehrere Besucher
-- Ideen als besorgt markieren können, braucht es eine freiwillige
-- Namensangabe, sonst ist für alle (inkl. Ersteller des Links) nicht mehr
-- erkennbar, WER eine Idee schon besorgt hat (Feedback: "Max hat das schon
-- besorgt" statt nur "besorgt").
alter table public.gifts
  add column purchased_by text;

comment on column public.gifts.purchased_by is
  'Freiwillige Namensangabe, wer die Idee als besorgt markiert hat (z. B. über die geteilte Ansicht). Wird beim Zurücksetzen auf "offen" wieder geleert.';
