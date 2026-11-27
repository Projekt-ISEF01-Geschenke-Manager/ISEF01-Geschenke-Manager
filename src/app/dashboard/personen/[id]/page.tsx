import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { PersonCard } from "@/components/person-card";
import { IdeenCard } from "@/components/ideen-card";
import { GiftItem, type Gift } from "@/components/gift-item";
import { ComingSoonCard } from "@/components/coming-soon-card";
import { PreviousGiftsCard, type PreviousGift } from "@/components/previous-gifts-card";
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
      "id, name, birthday_day, birthday_month, birthday_year, interests, notes, reminders_enabled",
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
    .select(
      "id, title, link, image_url, link_preview_url, status, occasion_id, gift_date, description, occasions(name)",
    )
    .eq("person_id", id)
    .order("created_at", { ascending: false });

  // status "given" (taeglicher convert-past-gifts-Job bei Geburtstag/
  // Weihnachten, oder manuell per "+ Geschenk nachtragen") taucht hier
  // nicht mehr als aktive Idee auf, sondern unten unter "Fruehere
  // Geschenke" (#21).
  const gifts: Gift[] = (giftsData ?? [])
    .filter((gift) => gift.status !== "given")
    .map((gift) => ({
      id: gift.id,
      title: gift.title,
      link: gift.link,
      image_url: gift.image_url,
      link_preview_url: gift.link_preview_url,
      status: gift.status,
      occasion_id: gift.occasion_id,
      occasion_name:
        (gift.occasions as unknown as { name: string } | null)?.name ?? null,
    }));

  const previousGifts: PreviousGift[] = (giftsData ?? [])
    .filter(
      (gift): gift is typeof gift & { gift_date: string } =>
        gift.status === "given" && gift.gift_date !== null,
    )
    .map((gift) => ({
      id: gift.id,
      title: gift.title,
      description: gift.description,
      occasion_name:
        (gift.occasions as unknown as { name: string } | null)?.name ?? null,
      gift_date: gift.gift_date,
    }))
    .sort((a, b) => b.gift_date.localeCompare(a.gift_date));

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
    <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-6 pt-8 pb-14 2xl:max-w-[1600px]">
      <Link href="/dashboard" className="btn btn-secondary btn-sm w-fit">
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
        Zurück zur Übersicht
      </Link>

      <PersonCard person={person} birthdayText={birthdayText} />

      {/* Zweispaltig wie im Wireframe (Kernansicht 2): Ideen links, Fruehere
          Geschenke + Vorschlaege rechts daneben. "Vorschlaege" ist weiterhin
          nur Platzhalter (#85 - regelbasierte Ideenvorschlaege, eigenes
          Issue, noch keins angelegt). */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <IdeenCard
          personId={person.id}
          giftsCount={gifts.length}
          occasions={occasions ?? []}
        >
          {gifts.length === 0 ? (
            <p className="text-sm text-muted">
              Noch keine Ideen für {person.name}.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {gifts.map((gift) => (
                <GiftItem
                  key={gift.id}
                  gift={gift}
                  occasions={occasions ?? []}
                />
              ))}
            </ul>
          )}
        </IdeenCard>

        <div className="flex flex-col gap-6">
          <PreviousGiftsCard
            personId={person.id}
            personName={person.name}
            occasions={occasions ?? []}
            gifts={previousGifts}
          />
          <ComingSoonCard
            title={`Vorschläge für ${person.name}`}
            description="Passend zu Interessen und bisherigen Geschenken schlagen wir dir hier automatisch neue Ideen vor. Folgt in einer späteren Ausbaustufe (#85)."
          />
        </div>
      </div>
    </main>
  );
}
