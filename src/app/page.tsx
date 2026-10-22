import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold">Geschenke-Manager</h1>
      <p className="max-w-md text-lg text-gray-600">
        Nie wieder das gleiche Geschenk zweimal: Personen, Anlässe und
        Geschenkideen an einem Ort.
      </p>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="rounded-full bg-black px-5 py-3 font-medium text-white"
        >
          Registrieren
        </Link>
        <Link
          href="/login"
          className="rounded-full border px-5 py-3 font-medium"
        >
          Anmelden
        </Link>
      </div>
    </main>
  );
}
