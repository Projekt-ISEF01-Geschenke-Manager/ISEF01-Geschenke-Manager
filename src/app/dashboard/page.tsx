import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/actions/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PersonForm } from "@/components/person-form";
import { DeletePersonButton } from "@/components/delete-person-button";
import { GiftForm } from "@/components/gift-form";
import { GiftItem, type Gift } from "@/components/gift-item";
import { formatBirthday } from "@/lib/format";

export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

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

  const { data: gifts } = await supabase
    .from("gifts")
    .select("id, person_id, title, link, status, occasions(name)")
    .order("created_at", { ascending: false });

  const giftsByPerson = new Map<string, Gift[]>();
  for (const gift of gifts ?? []) {
    const list = giftsByPerson.get(gift.person_id) ?? [];
    list.push({
      id: gift.id,
      title: gift.title,
      link: gift.link,
      status: gift.status,
      occasion_name:
        (gift.occasions as unknown as { name: string } | null)?.name ?? null,
    });
    giftsByPerson.set(gift.person_id, list);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Übersicht</h1>
          <form action={signout}>
            <button
              type="submit"
              className="cursor-pointer rounded-full border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              Abmelden
            </button>
          </form>
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
              return (
                <div
                  key={person.id}
                  className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700"
                >
                  <div className="flex items-start justify-between gap-4">
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
                      {person.notes && (
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                          {person.notes}
                        </p>
                      )}
                    </div>
                    <DeletePersonButton
                      personId={person.id}
                      personName={person.name}
                    />
                  </div>

                  {(() => {
                    const personGifts = giftsByPerson.get(person.id) ?? [];
                    return personGifts.length > 0 ? (
                      <ul className="mt-3 divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
                        {personGifts.map((gift) => (
                          <GiftItem key={gift.id} gift={gift} />
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                        Noch keine Ideen.
                      </p>
                    );
                  })()}

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-neutral-600 underline dark:text-neutral-400">
                      Bearbeiten
                    </summary>
                    <div className="mt-3">
                      <PersonForm person={person} />
                    </div>
                  </details>
                </div>
              );
            })
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
