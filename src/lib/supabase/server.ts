import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Server-side Supabase client for Server Components, Route Handlers and
// Server Actions. Reads/writes the auth session via Next.js cookies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component without write access to cookies.
            // Safe to ignore when middleware refreshes the session.
          }
        },
      },
    },
  );
}

// Gemeinsame Auth-Pruefung fuer Server Components, die eine eingeloggte
// Nutzer:in brauchen (Dashboard, Personenseite, ...). Leitet sonst zur
// Startseite weiter - an einer Stelle gepflegt, damit beide Seiten
// konsistent bleiben (Codacy-Review-Hinweis).
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return { supabase, user };
}
