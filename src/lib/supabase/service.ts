import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Nur fuer die oeffentliche Teilen-Route (/teilen/[token], kein Login).
// Der Secret Key umgeht RLS vollstaendig - RLS kann "gehoert dieser Token
// zu dieser Zeile" fuer anonyme Zugriffe nicht sauber abbilden, siehe
// docs/database-schema.md Abschnitt 3. Der Token selbst ist das
// Zugriffsrecht; diese Route prueft ihn explizit und gibt gezielt nur die
// zugeordneten Personen/Ideen zurueck. Niemals fuer eingeloggte
// Nutzer:innen-Aktionen verwenden - dafuer immer createClient()/requireUser().
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
