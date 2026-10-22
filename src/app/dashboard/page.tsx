import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "./actions";

// Liest die Session (cookies()) und kann deshalb nicht statisch vorgerendert
// werden (Next.js 16 "Cache Components"). Einfachster zulässiger Weg laut
// Next.js-Doku für session-abhängige Seiten: als blockierend markieren.
export const instant = false;

// Dient aktuell als Nachweis, dass Login/Session funktionieren.
// Wird später durch die Personenliste ersetzt bzw. verlinkt diese.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Eingeloggt</h1>
      <p className="text-gray-600">Angemeldet als {user.email}</p>

      <form action={signout}>
        <button type="submit" className="rounded-md border px-4 py-2">
          Abmelden
        </button>
      </form>
    </main>
  );
}
