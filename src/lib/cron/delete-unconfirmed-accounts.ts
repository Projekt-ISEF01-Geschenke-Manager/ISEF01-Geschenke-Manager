import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_UNCONFIRMED_AGE_DAYS = 7;
const USERS_PER_PAGE = 200;

// ZA8: Konten, deren E-Mail-Adresse 7 Tage nach der Registrierung noch
// nicht bestaetigt wurde, werden automatisch geloescht. Dank "on delete
// cascade" auf allen user_id-Fremdschluesseln (siehe
// docs/database-schema.md) loescht Supabase beim Entfernen des
// Auth-Nutzers automatisch auch dessen Personen/Anlaesse/Ideen/
// Freigabe-Links mit - keine manuelle Aufraeumarbeit noetig.
//
// Test-Accounts (#81) sind ausgenommen: dafuer wird beim Anlegen
// app_metadata.is_test_account auf true gesetzt (per Supabase Admin API
// bzw. im Dashboard), siehe Akzeptanzkriterium in #89.
export async function deleteUnconfirmedAccounts(): Promise<void> {
  const supabase = createServiceClient();
  const cutoff = Date.now() - MAX_UNCONFIRMED_AGE_DAYS * 24 * 60 * 60 * 1000;

  const toDelete: string[] = [];
  let page = 1;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });

    if (error) {
      throw new Error(`Nutzerliste konnte nicht geladen werden: ${error.message}`);
    }

    const users = data.users;
    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      const isUnconfirmed = !user.email_confirmed_at;
      const isOldEnough = new Date(user.created_at).getTime() <= cutoff;
      const isTestAccount = user.app_metadata?.is_test_account === true;

      if (isUnconfirmed && isOldEnough && !isTestAccount) {
        toDelete.push(user.id);
      }
    }

    page += 1;
  }

  // Jedes Konto einzeln loeschen, statt beim ersten Fehler abzubrechen -
  // ein fehlschlagendes Konto soll die anderen nicht blockieren. Fehler
  // werden gesammelt und am Ende als ein Fehler gemeldet, damit
  // runDailyJobs() den Job als fehlgeschlagen verzeichnet.
  const errors: string[] = [];
  for (const id of toDelete) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      errors.push(`${id}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `${errors.length} von ${toDelete.length} Konten konnten nicht gelöscht werden: ${errors.join("; ")}`,
    );
  }
}
