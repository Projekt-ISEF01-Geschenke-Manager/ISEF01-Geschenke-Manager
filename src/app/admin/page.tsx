import { CheckCircle2, XCircle } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/server";
import { listAllAccounts } from "@/app/actions/admin";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DeleteAccountButton } from "@/components/delete-account-button";

export const instant = false;

// Minimale eigene Seite statt DashboardLayout/DashboardNav (#90, ZA5) -
// die Admin-Uebersicht ist kein Teil der normalen Dashboard-Navigation,
// SiteHeader hier bewusst ohne nav-Prop.
export default async function AdminPage() {
  await requireAdmin();
  const accounts = await listAllAccounts();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold text-heading">Konten verwalten</h1>

        <div className="surface reveal mt-6 overflow-x-auto rounded-2xl">
          {accounts.length === 0 ? (
            <p className="p-6 text-sm text-muted">Kein Konto vorhanden.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="px-4 py-3 font-medium">E-Mail</th>
                  <th className="px-4 py-3 font-medium">Registriert am</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">{account.email}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(account.createdAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      {account.confirmed ? (
                        <span className="inline-flex items-center gap-1.5 text-success">
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                          Bestätigt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-danger">
                          <XCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                          Nicht bestätigt
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DeleteAccountButton accountId={account.id} email={account.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
