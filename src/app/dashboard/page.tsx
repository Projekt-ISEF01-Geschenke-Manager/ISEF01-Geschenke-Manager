import { requireUser } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardOverview, type UpcomingEntry } from "@/components/dashboard-overview";
import { type PersonCard } from "@/components/person-search-list";
import { formatBirthday } from "@/lib/format";
import {
  CHRISTMAS_DAY,
  CHRISTMAS_MONTH,
  daysUntilNextOccurrence,
} from "@/lib/upcoming";

export const instant = false;

// Geburtstage der naechsten 60 Tage + Weihnachten (Uebersicht-Wireframe
// Annotation 5). Gleiche Reichweite wie die geplante Monatsmail (A6).
const UPCOMING_WINDOW_DAYS = 60;

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  // Nur der Vorname (siehe Wireframe-Annotation "Vorname aus der
  // Registrierung") - full_name koennte theoretisch mehrere Woerter
  // enthalten, auch wenn das Registrierungsformular selbst nur nach dem
  // Vornamen fragt.
  const firstName = (user.user_metadata?.full_name as string | undefined)
    ?.trim()
    .split(/\s+/)[0];

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
      <SiteHeader userName={firstName} />
      <DashboardNav active="uebersicht" />
      {/* Gleicher Verlauf wie auf Startseite/Login (siehe DESIGN-DARKMODE.md)
          - ohne ihn wirkte der Dashboard-Hintergrund im Dunkelmodus flach
          schwarz statt stimmig zum Header auszulaufen. */}
      <div
        className="flex flex-1 flex-col"
        style={{
          background: "linear-gradient(180deg, var(--bg-fade-top) 0%, var(--bg) 100%)",
        }}
      >
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
          <DashboardOverview
            people={(people ?? []).map((p) => ({ id: p.id, name: p.name }))}
            personCards={personCards}
            occasions={occasions ?? []}
            upcoming={upcoming}
            weihnachten={
              weihnachtenPeopleCount > 0
                ? {
                    peopleCount: weihnachtenPeopleCount,
                    purchasedCount: weihnachtenPurchasedCount,
                  }
                : null
            }
          />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
