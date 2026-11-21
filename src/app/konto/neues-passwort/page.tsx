import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NewPasswordForm } from "@/components/new-password-form";
import { requireUser } from "@/lib/supabase/server";

// Next.js 16 "Cache Components": Seite prueft die Session (Cookies), muss
// deshalb explizit als dynamisch markiert werden, siehe docs/auth-flow.md
// Abschnitt 4.
export const instant = false;

// Erreichbar nach Klick auf den Link aus requestPasswordReset(): /auth/confirm
// verifiziert dort das Recovery-Token und richtet dabei schon eine Sitzung
// ein. requireUser() leitet zur Startseite weiter, falls der Link ungueltig
// oder abgelaufen war (siehe docs/auth-flow.md).
export default async function NeuesPasswortPage() {
  await requireUser();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10">
        <NewPasswordForm />
      </main>

      <SiteFooter />
    </>
  );
}
