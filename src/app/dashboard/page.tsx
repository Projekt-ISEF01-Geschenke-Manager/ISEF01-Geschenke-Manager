import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signout } from "@/app/actions/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PersonForm } from "@/components/person-form";
import { GiftForm } from "@/components/gift-form";
import { PersonSearchList, type PersonCard } from "@/components/person-search-list";
import { formatBirthday, monthAbbreviation } from "@/lib/format";
import {
  CHRISTMAS_DAY,
  CHRISTMAS_MONTH,
  daysUntilNextOccurrence,
  formatDaysUntil,
} from "@/lib/upcoming";

export const instant = false;

// Geburtstage der naechsten 60 Tage + Weihnachten (Uebersicht-Wireframe
// Annotation 5). Gleiche Reichweite wie die geplante Monatsmail (A6).
const UPCOMING_WINDOW_DAYS = 60;

type UpcomingEntry = {
  key: string;
  day: number;
  month: number;
  daysUntil: number;
  label: string;
  href: string | null;
  detail: string;
};

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const firstName = user.user_metadata?.full_name as string | undefined;

  const { data: people } = await supabase
    .from("people")
    .select("id, name, birthday_day, birthday_month, birthday_year, interests")
    .order("name");

  const { data: occasions } = await supabase
    .from("occasions")
    .select("id, name")
    .order("name");

  const { data: gifts } = await supabase
    .from("gifts")
    .select("person_id, status, occasion_id");

  const ideaCounts = new Map<string, number>();
  const purchasedCounts = new Map<string, number>();
  for (const gift of gifts ?? []) {
    const counts = gift.status === "purchased" ? purchasedCounts : ideaCounts;
    counts.set(gift.person_id, (counts.get(gift.person_id) ?? 0) + 1);
  }

  const today = new Date();
  const upcoming: UpcomingEntry[] = [];

  for (const person of people ?? []) {
    if (!person.birthday_day || !person.birthday_month) continue;
    const daysUntil = daysUntilNextOccurrence(
      person.birthday_day,
      person.birthday_month,
      today,
    );
    if (daysUntil > UPCOMING_WINDOW_DAYS) continue;

    const ideaCount = ideaCounts.get(person.id) ?? 0;
    upcoming.push({
      key: `birthday-${person.id}`,
      day: person.birthday_day,
      month: person.birthday_month,
      daysUntil,
      label: "Geburtstag",
      href: `/dashboard/personen/${person.id}`,
      detail: `${ideaCount} ${ideaCount === 1 ? "Idee" : "Ideen"}`,
    });
  }

  if (people && people.length > 0) {
    const daysUntilChristmas = daysUntilNextOccurrence(
      CHRISTMAS_DAY,
      CHRISTMAS_MONTH,
      today,
    );
    if (daysUntilChristmas <= UPCOMING_WINDOW_DAYS) {
      upcoming.push({
        key: "christmas",
        day: CHRISTMAS_DAY,
        month: CHRISTMAS_MONTH,
        daysUntil: daysUntilChristmas,
        label: "Weihnachten",
        href: null,
        detail: `${people.length} ${people.length === 1 ? "Person" : "Personen"}`,
      });
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

  // Weihnachtsstatus (Wireframe-Annotation 6): von den Personen mit
  // mindestens einer Weihnachts-Idee, wie viele haben schon ein "besorgt"
  // markiertes Geschenk dafuer.
  const weihnachtenId = occasions?.find((o) => o.name === "Weihnachten")?.id;
  const weihnachtenPurchasedByPerson = new Map<string, boolean>();
  if (weihnachtenId) {
    for (const gift of gifts ?? []) {
      if (gift.occasion_id !== weihnachtenId) continue;
      const alreadyPurchased = weihnachtenPurchasedByPerson.get(gift.person_id) ?? false;
      weihnachtenPurchasedByPerson.set(
        gift.person_id,
        alreadyPurchased || gift.status === "purchased",
      );
    }
  }
  const weihnachtenPeopleCount = weihnachtenPurchasedByPerson.size;
  const weihnachtenPurchasedCount = [...weihnachtenPurchasedByPerson.values()].filter(
    Boolean,
  ).length;

  const personCards: PersonCard[] = (people ?? []).map((person) => ({
    id: person.id,
    name: person.name,
    birthday: formatBirthday(
      person.birthday_day,
      person.birthday_month,
      person.birthday_year,
    ),
    interests: person.interests,
    ideaCount: ideaCounts.get(person.id) ?? 0,
    purchasedCount: purchasedCounts.get(person.id) ?? 0,
  }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          {firstName && (
            <span>
              Angemeldet als <strong className="text-neutral-900 dark:text-white">{firstName}</strong>
            </span>
          )}
          <nav className="flex items-center gap-4">
            <span className="font-medium text-neutral-900 dark:text-white">
              Übersicht
            </span>
            <Link href="/dashboard/teilen" className="hover:underline">
              Geteilte Links
            </Link>
          </nav>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Deine Übersicht</h1>
          <form action={signout}>
            <button
              type="submit"
              className="cursor-pointer rounded-full border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              Abmelden
            </button>
          </form>
        </div>

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

        <details
          id="person-anlegen"
          className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700"
        >
          <summary className="cursor-pointer font-medium">
            + Person anlegen
          </summary>
          <div className="mt-4">
            <PersonForm />
          </div>
        </details>

        {upcoming.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold">Nächste Anlässe</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {upcoming.map((entry) => {
                const content = (
                  <>
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-100 text-xs leading-tight dark:bg-neutral-800">
                      <span className="font-semibold">{entry.day}.</span>
                      <span>{monthAbbreviation(entry.month)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{entry.label}</span>
                      <span className="block text-sm text-neutral-600 dark:text-neutral-400">
                        {formatDaysUntil(entry.daysUntil)} · {entry.detail}
                      </span>
                    </span>
                  </>
                );

                return (
                  <li key={entry.key}>
                    {entry.href ? (
                      <Link
                        href={entry.href}
                        className="flex items-center gap-3 rounded-2xl border border-neutral-300 p-3 transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 rounded-2xl border border-neutral-300 p-3 dark:border-neutral-700">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {weihnachtenPeopleCount > 0 && (
          <div className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
            <h2 className="font-semibold">Weihnachtsstatus</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {weihnachtenPurchasedCount} von {weihnachtenPeopleCount}{" "}
              {weihnachtenPeopleCount === 1 ? "Person" : "Personen"} besorgt
            </p>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold">
            Deine Personen {people ? `(${people.length})` : ""}
          </h2>
          <div className="mt-2">
            <PersonSearchList people={personCards} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
