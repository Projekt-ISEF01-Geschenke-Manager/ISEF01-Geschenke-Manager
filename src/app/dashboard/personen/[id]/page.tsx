import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PersonForm } from "@/components/person-form";
import { DeletePersonButton } from "@/components/delete-person-button";
import { GiftForm } from "@/components/gift-form";
import { GiftItem, type Gift } from "@/components/gift-item";
import { formatBirthday } from "@/lib/format";

export const instant = false;

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: person } = await supabase
    .from("people")
    .select(
      "id, name, birthday_day, birthday_month, birthday_year, interests, notes",
    )
    .eq("id", id)
    .single();

  // RLS liefert fuer fremde oder nicht existierende Personen ebenfalls
  // kein Ergebnis - 404 in beiden Faellen, verraet also nichts.
  if (!person) {
    notFound();
  }

  const { data: occasions } = await supabase
    .from("occasions")
    .select("id, name")
    .order("name");

  const { data: giftsData } = await supabase
    .from("gifts")
    .select("id, title, link, status, occasions(name)")
    .eq("person_id", id)
    .order("created_at", { ascending: false });

  const gifts: Gift[] = (giftsData ?? []).map((gift) => ({
    id: gift.id,
    title: gift.title,
    link: gift.link,
    status: gift.status,
    occasion_name:
      (gift.occasions as unknown as { name: string } | null)?.name ?? null,
  }));

  const birthday = formatBirthday(
    person.birthday_day,
    person.birthday_month,
    person.birthday_year,
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <Link
          href="/dashboard"
          className="w-fit text-sm text-neutral-600 hover:underline dark:text-neutral-400"
        >
          ‹ Zurück zur Übersicht
        </Link>

        <div className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
          <h1 className="text-xl font-semibold">{person.name}</h1>
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

          <div className="mt-3 flex items-center gap-4">
            <details>
              <summary className="cursor-pointer text-sm text-neutral-600 underline dark:text-neutral-400">
                Bearbeiten
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                <PersonForm person={person} />
                <DeletePersonButton
                  personId={person.id}
                  personName={person.name}
                  redirectTo="/dashboard"
                />
              </div>
            </details>
            <Link
              href={`/dashboard/teilen?person=${person.id}`}
              className="text-sm text-neutral-600 underline dark:text-neutral-400"
            >
              Ideen teilen
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-neutral-900 p-4 dark:border-white">
          <h2 className="font-semibold">Idee erfassen</h2>
          <div className="mt-3">
            <GiftForm
              occasions={occasions ?? []}
              defaultPersonId={person.id}
              lockedPersonName={person.name}
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Ideen ({gifts.length})</h2>
          {gifts.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Noch keine Ideen für {person.name}.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {gifts.map((gift) => (
                <GiftItem key={gift.id} gift={gift} />
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
