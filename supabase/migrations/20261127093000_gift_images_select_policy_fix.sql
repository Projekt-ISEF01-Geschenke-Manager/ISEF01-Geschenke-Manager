-- ============================================================================
-- Geschenke-Manager: gift-images SELECT-Policy einschraenken (Review-Fund, #95)
-- ============================================================================
-- Ausführliche Erklärung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

-- Die urspruengliche Policy "gift_images_select_all" erlaubte SELECT fuer
-- jede(n), auch anonym, auf den gesamten Bucket. Das oeffentliche Anzeigen
-- einzelner Bilder (per <img src>) braucht das NICHT - der "public"-Download-
-- Endpunkt eines public-Buckets umgeht RLS ohnehin vollstaendig. Mit der
-- offenen Policy konnte aber jede(r) mit dem Publishable Key den ganzen
-- Bucket per list() auflisten und so user_id/gift_id-Paare aller Nutzer:innen
-- einsehen - unabhaengig davon, ob die jeweilige Idee je geteilt wurde.
-- SELECT bleibt nur fuer eingeloggte Nutzer:innen auf dem eigenen Pfad-
-- Praefix noetig (z. B. fuer upsert:true beim erneuten Hochladen).
drop policy "gift_images_select_all" on storage.objects;

create policy "gift_images_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'gift-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
