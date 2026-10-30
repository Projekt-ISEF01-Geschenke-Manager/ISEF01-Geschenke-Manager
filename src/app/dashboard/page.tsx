import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signout } from "@/app/actions/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PersonForm } from "@/components/person-form";
import { GiftForm } from "@/components/gift-form";
import { formatBirthday } from "@/lib/format";

export const instant = false;

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  const { data: people } = await supabase
    .from("people")
    .select(
      "id, name, birthday_day, birthday_month, birthday_year, interests, notes",
    )
    .order("name");

  const { data: occasions } = await supabase
    .from("occasions")
    .select("id, name")
    .order("name");

  const { data: gifts } = await supabase.from("gifts").select("person_id");

  const giftCountByPerson = new Map<string, number>();
  for (const gift of gifts ?? []) {
    giftCountByPerson.set(
      gift.person_id,
      (giftCountByPerson.get(gift.person_id) ?? 0) + 1,
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Übersicht</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/teilen"
              className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
            >
              Geteilte Links
            </Link>
            <form action={signout}>
              <button
                type="submit"
                className="cursor-pointer rounded-full border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>

        <details className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
          <summary className="cursor-pointer font-medium">
            + Person anlegen
          </summary>
          <div className="mt-4">
            <PersonForm />
          </div>
        </details>

        {people && people.length > 0 && (
          <details
            open
            className="rounded-2xl border-2 border-neutral-900 p-4 dark:border-white"
          >
            <summary className="cursor-pointer font-semibold">
              + Idee erfassen
            </summary>
            <div className="mt-4">
              <GiftForm
                people={people.map((p) => ({ id: p.id, name: p.name }))}
                occasions={occasions ?? []}
              />
            </div>
          </details>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">
            Deine Personen {people ? `(${people.length})` : ""}
          </h2>

          {!people || people.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Lege deine erste Person an.
            </p>
          ) : (
            people.map((person) => {
              const birthday = formatBirthday(
                person.birthday_day,
                person.birthday_month,
                person.birthday_year,
              );
              const giftCount = giftCountByPerson.get(person.id) ?? 0;
              return (
                <Link
                  key={person.id}
                  href={`/dashboard/personen/${person.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-300 p-4 transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  <div>
                    <p className="font-medium">{person.name}</p>
                    {birthday && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Geburtstag: {birthday}
                      </p>
                    )}
                    {person.interests.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {person.interests.map((tag: string) => (
                          <span
                            key={tag}
                            className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs dark:bg-neutral-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {giftCount} {giftCount === 1 ? "Idee" : "Ideen"}
                    <span aria-hidden>›</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
