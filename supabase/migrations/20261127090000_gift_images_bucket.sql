-- ============================================================================
-- Geschenke-Manager: Storage-Bucket für Idee-Bilder (A8, Stufe 3, #95)
-- ============================================================================
-- Ausführliche Erklärung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gift-images',
  'gift-images',
  true,
  4194304, -- 4 MB - zweite Huerde neben der Pruefung in updateGift() (defense in depth)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Pfadschema: "{user_id}/{gift_id}" (kein Dateiname/Endung - der Content-Type
-- kommt beim Upload explizit mit, siehe updateGift()). storage.foldername(name)
-- liefert die Pfad-Segmente vor dem Dateinamen, [1] ist damit die user_id.
create policy "gift_images_select_all" on storage.objects
  for select using (bucket_id = 'gift-images');

create policy "gift_images_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'gift-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "gift_images_update_own" on storage.objects
  for update using (
    bucket_id = 'gift-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "gift_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'gift-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
