-- ============================================================================
-- Geschenke-Manager: Rate-Limiting fuer Login/Registrierung (QA5)
-- ============================================================================
-- Ausfuehrliche Erklaerung: docs/database-schema.md
-- ============================================================================

create table public.rate_limit_attempts (
  id uuid primary key default gen_random_uuid(),
  -- "login" | "register" - "reset" kommt mit der Passwort-Reset-Funktion
  -- (Stufe 2) dazu.
  action text not null,
  -- E-Mail (klein geschrieben), fuer die der Versuch zaehlt.
  identifier text not null,
  created_at timestamptz not null default now()
);

comment on table public.rate_limit_attempts is
  'Zaehlt Login-/Registrierungs-Versuche je E-Mail fuer das Rate-Limiting (QA5: "begrenzte Versuche bei Login, Registrierung und Reset"). Laeuft vor dem Login, also ohne auth.uid() - deshalb RLS ohne Policies (nur ueber den Service-Role-Key erreichbar), siehe docs/database-schema.md Abschnitt 3.';

create index rate_limit_attempts_lookup_idx
  on public.rate_limit_attempts (action, identifier, created_at);

alter table public.rate_limit_attempts enable row level security;
-- Bewusst keine Policies: weder lesen noch schreiben ueber den Publishable
-- Key moeglich (Default-Deny bei aktiviertem RLS ohne Policy). Nur der
-- serverseitige Service-Role-Client (src/lib/rate-limit.ts) kommt dran.
