import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/actions/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Übersicht (Kernansicht nach dem Login). Es gibt dafür noch kein
// detailliertes Wireframe, daher bewusst ein einfacher Platzhalter –
// wird durch die Personenliste etc. ersetzt, sobald das Wireframe
// vorliegt.
export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-semibold">Übersicht</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Angemeldet als {user.email}. Hier entsteht als Nächstes die
          Personenliste.
        </p>

        <form action={signout}>
          <button
            type="submit"
            className="cursor-pointer transition active:scale-95 rounded-full border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            Abmelden
          </button>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}
