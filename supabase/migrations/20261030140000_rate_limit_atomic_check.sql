-- ============================================================================
-- Geschenke-Manager: Atomare Rate-Limit-Pruefung (Review-Feedback zu QA5)
-- ============================================================================
-- Ausfuehrliche Erklaerung: docs/database-schema.md
--
-- Vorheriger Ansatz (getrennte select-count- und insert-Aufrufe aus
-- src/lib/rate-limit.ts) hatte eine Race Condition: mehrere parallele
-- Anfragen fuer dieselbe E-Mail konnten alle den Zaehlerstand VOR dem
-- jeweils eigenen insert lesen und so gemeinsam ueber das Limit kommen
-- (TOCTOU). Diese Funktion macht Zaehlen + Reservieren in einer einzigen
-- Transaktion und serialisiert gleichzeitige Aufrufe fuer dieselbe
-- Aktion+E-Mail ueber einen Advisory Lock, der nur innerhalb dieser
-- Transaktion gilt.
-- ============================================================================

create or replace function public.check_and_record_rate_limit(
  p_action text,
  p_identifier text,
  p_window_minutes int,
  p_max_attempts int
) returns table (attempt_id uuid, limited boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identifier text := lower(p_identifier);
  v_count int;
  v_id uuid;
begin
  -- Serialisiert gleichzeitige Aufrufe fuer dieselbe Aktion+E-Mail - gilt
  -- nur bis zum Ende dieser Transaktion (pg_advisory_XACT_lock), blockiert
  -- also nichts fuer andere E-Mails oder nach dem Rueckgabewert.
  perform pg_advisory_xact_lock(hashtext(p_action || ':' || v_identifier));

  select count(*) into v_count
  from public.rate_limit_attempts a
  where a.action = p_action
    and a.identifier = v_identifier
    and a.created_at > now() - (p_window_minutes || ' minutes')::interval;

  if v_count >= p_max_attempts then
    return query select null::uuid, true;
    return;
  end if;

  insert into public.rate_limit_attempts (action, identifier)
  values (p_action, v_identifier)
  returning id into v_id;

  -- Raeumt nebenbei alte Zeilen auf, statt einen eigenen Cron-Job dafuer
  -- zu brauchen.
  delete from public.rate_limit_attempts
  where created_at < now() - interval '24 hours';

  return query select v_id, false;
end;
$$;

comment on function public.check_and_record_rate_limit is
  'Prueft das Rate-Limit (QA5) und reserviert bei Erfolg atomar eine Zeile - schliesst die Race Condition der getrennten select+insert-Aufrufe. Bei limited=true ist attempt_id null. Nur ueber den Service-Role-Client aufrufbar (security definer, aber rate_limit_attempts hat ohnehin keine Policies fuer den Publishable Key).';

-- Macht eine Reservierung rueckgaengig (erfolgreicher Login soll nicht
-- gegen das Limit zaehlen).
create or replace function public.release_rate_limit_attempt(
  p_attempt_id uuid
) returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_attempts where id = p_attempt_id;
$$;
