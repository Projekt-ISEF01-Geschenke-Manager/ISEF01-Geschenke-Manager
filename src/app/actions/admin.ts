"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const USERS_PER_PAGE = 200;

export type AdminAccountRow = {
  id: string;
  email: string;
  createdAt: string;
  confirmed: boolean;
};

// Admin-Pruefung fuer beide Server Actions dieser Datei - requireUser()
// statt requireAdmin() aus server.ts, weil requireAdmin() bei fehlender
// Berechtigung redirect("/") aufruft (fuer Server Components gedacht) statt
// einen Fehler zu werfen, den Server Actions sauber als Fehlertext
// zurueckgeben koennen (siehe deleteAccount unten).
async function assertAdmin(): Promise<void> {
  const { user } = await requireUser();
  if (user.app_metadata?.is_admin !== true) {
    throw new Error("Kein Admin-Konto.");
  }
}

// Laedt alle Konten ueber die Supabase Admin API (Service-Role-Client,
// gleiches Pagination-Muster wie deleteUnconfirmedAccounts()/
// sendChristmasStatusOverview()). Anders als die Cron-Jobs werden
// unbestaetigte Konten hier NICHT herausgefiltert, sondern mit
// confirmed:false angezeigt (#90: "bestaetigt ja/nein" als Spalte in der
// Admin-Uebersicht). Test-Accounts (#81) werden weiterhin ausgeblendet.
export async function listAllAccounts(): Promise<AdminAccountRow[]> {
  await assertAdmin();

  const supabase = createServiceClient();
  const accounts: AdminAccountRow[] = [];
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
    if (users.length === 0) break;

    for (const user of users) {
      if (user.app_metadata?.is_test_account === true) continue;
      accounts.push({
        id: user.id,
        email: user.email ?? "",
        createdAt: user.created_at,
        confirmed: !!user.email_confirmed_at,
      });
    }

    page += 1;
  }

  return accounts;
}

export type DeleteAccountState = { error?: string } | undefined;

// Dritter Parameter (prevState von useActionState) wird nicht ausgewertet,
// muss aber fuer die Bindung an useActionState in der Signatur stehen
// (gleiches Muster wie deletePerson() in people.ts).
export async function deleteAccount(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState?: DeleteAccountState,
): Promise<DeleteAccountState> {
  await assertAdmin();

  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
}
