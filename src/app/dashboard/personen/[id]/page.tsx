import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PersonCard } from "@/components/person-card";
import { QuickAddGiftForm } from "@/components/quick-add-gift-form";
import { GiftItem, type Gift } from "@/components/gift-item";
import { formatBirthday } from "@/lib/format";
import { daysUntilNextOccurrence, formatDaysUntil } from "@/lib/upcoming";

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
    .select("id, title, link, status, occasion_id, occasions(name)")
    .eq("person_id", id)
    .order("created_at", { ascending: false });

  const gifts: Gift[] = (giftsData ?? []).map((gift) => ({
    id: gift.id,
    title: gift.title,
    link: gift.link,
    status: gift.status,
    occasion_id: gift.occasion_id,
    occasion_name:
      (gift.occasions as unknown as { name: string } | null)?.name ?? null,
  }));

  // Countdown nur, wenn Tag UND Monat gesetzt sind (Jahr bleibt optional,
  // siehe formatBirthday) - Personenseite-Wireframe: "Geburtstag: 14.
  // November · in 19 Tagen".
  const birthdayText =
    person.birthday_day !== null && person.birthday_month !== null
      ? `${formatBirthday(person.birthday_day, person.birthday_month, person.birthday_year)} · ${formatDaysUntil(
          daysUntilNextOccurrence(
            person.birthday_day,
            person.birthday_month,
            new Date(),
          ),
        )}`
      : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 2xl:max-w-3xl">
      <Link
        href="/dashboard"
        className="w-fit text-sm text-neutral-600 hover:underline dark:text-neutral-400"
      >
        ‹ Zurück zur Übersicht
      </Link>

      <PersonCard person={person} birthdayText={birthdayText} />

      <div className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">Ideen ({gifts.length})</h2>
        <div className="mt-3">
          <QuickAddGiftForm personId={person.id} />
        </div>

        {gifts.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            Noch keine Ideen für {person.name}.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {gifts.map((gift) => (
              <GiftItem key={gift.id} gift={gift} occasions={occasions ?? []} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
