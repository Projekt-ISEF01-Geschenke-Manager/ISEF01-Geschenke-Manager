"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const USERS_PER_PAGE = 200;

export type AdminAccountRow = {
  id: string;
  email: string;
  createdAt: string;
  confirmed: boolean;
};

// Admin-Pruefung fuer beide Server Actions dieser Datei - delegiert
// bewusst an requireAdmin() aus server.ts (statt die Pruefung hier erneut
// mit einem eigenen throw nachzubauen), damit Nicht-Admins IMMER identisch
// behandelt werden, egal ob eingeloggt oder nicht: beide Faelle landen in
// requireAdmin() -> requireUser() -> redirect("/") (NEXT_REDIRECT), nie in
// einem unterscheidbaren Error. Ein eigener throw hier wuerde dagegen einen
// "eingeloggt, aber kein Admin"-Fall vom "gar nicht eingeloggt"-Fall
// unterscheidbar machen - genau das soll laut Plan (Global Constraint)
// nicht passieren.
async function assertAdmin(): Promise<void> {
  await requireAdmin();
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
