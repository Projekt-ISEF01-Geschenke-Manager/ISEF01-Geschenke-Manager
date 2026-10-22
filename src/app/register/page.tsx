import Link from "next/link";
import { signup } from "./actions";

// Liest searchParams (Fehlermeldung nach Redirect) -> kann nicht statisch
// vorgerendert werden (Next.js 16 "Cache Components").
export const instant = false;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Registrieren</h1>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={signup} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          E-Mail
          <input
            type="email"
            name="email"
            required
            className="rounded-md border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Passwort
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="rounded-md border px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-md bg-black px-4 py-2 text-white">
          Konto erstellen
        </button>
      </form>

      <p className="text-sm text-gray-600">
        Schon registriert?{" "}
        <Link href="/login" className="underline">
          Anmelden
        </Link>
      </p>
    </main>
  );
}
