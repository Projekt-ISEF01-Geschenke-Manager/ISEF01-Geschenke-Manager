import { Mail } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { resendConfirmation } from "@/app/actions/auth";
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
  formatDaysUntil,
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

  // Weihnachtsstatus (Wireframe-Annotation 6): von den Personen mit
  // mindestens einer Weihnachts-Idee, wie viele haben schon ein "besorgt"
  // markiertes Geschenk dafuer. Vorgezogen (lief vorher nach dem
  // upcoming-Aufbau), weil der "X Ideen"-Chip des Weihnachten-Eintrags in
  // der Anlässe-Liste dieselbe occasion-ID braucht.
  const weihnachtenId = occasions?.find((o) => o.name === "Weihnachten")?.id;
  const weihnachtenGifts = (gifts ?? []).filter((g) => g.occasion_id === weihnachtenId);
  const weihnachtenPurchasedByPerson = new Map<string, boolean>();
  for (const gift of weihnachtenGifts) {
    const alreadyPurchased = weihnachtenPurchasedByPerson.get(gift.person_id) ?? false;
    weihnachtenPurchasedByPerson.set(
      gift.person_id,
      alreadyPurchased || gift.status === "purchased",
    );
  }
  const weihnachtenPeopleCount = weihnachtenPurchasedByPerson.size;
  const weihnachtenPurchasedCount = [...weihnachtenPurchasedByPerson.values()].filter(
    Boolean,
  ).length;

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
      title: person.name,
      subtitle: `Geburtstag · ${formatDaysUntil(daysUntil)}`,
      chip: `${ideaCount} ${ideaCount === 1 ? "Idee" : "Ideen"}`,
    });
  }

  const daysUntilChristmas = daysUntilNextOccurrence(CHRISTMAS_DAY, CHRISTMAS_MONTH, today);
  const christmasYear = new Date(
    today.getTime() + daysUntilChristmas * 24 * 60 * 60 * 1000,
  ).getFullYear();

  if (people && people.length > 0 && daysUntilChristmas <= UPCOMING_WINDOW_DAYS) {
    const giftCount = weihnachtenGifts.length;
    upcoming.push({
      key: "christmas",
      day: CHRISTMAS_DAY,
      month: CHRISTMAS_MONTH,
      daysUntil: daysUntilChristmas,
      title: "Weihnachten",
      subtitle: `${formatDaysUntil(daysUntilChristmas)} · ${people.length} ${people.length === 1 ? "Person" : "Personen"}`,
      chip: `${giftCount} ${giftCount === 1 ? "Idee" : "Ideen"}`,
    });
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

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
      {/* Verlauf unter Header/Nav, 260px lang (Referenz: Uebersicht.dc.html). */}
      <div
        className="flex flex-1 flex-col"
        style={{
          background: "linear-gradient(180deg, var(--bg-fade-top) 0px, var(--bg) 260px)",
        }}
      >
        <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-6 pt-8 pb-14">
          {!user.email_confirmed_at && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-tile px-4 py-3">
              <div className="flex items-center gap-3 text-sm text-text">
                <Mail className="h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
                <span>
                  Bitte bestätige deine E-Mail-Adresse – erst dann schicken wir dir
                  Erinnerungen.
                </span>
              </div>
              <form action={resendConfirmation}>
                <button
                  type="submit"
                  className="h-10 cursor-pointer rounded-full border border-accent px-[18px] text-sm font-medium text-accent transition hover:opacity-85 active:scale-95"
                >
                  Erneut senden
                </button>
              </form>
            </div>
          )}
          <DashboardOverview
            people={(people ?? []).map((p) => ({ id: p.id, name: p.name }))}
            personCards={personCards}
            occasions={occasions ?? []}
            upcoming={upcoming}
            weihnachten={
              weihnachtenPeopleCount > 0
                ? {
                    year: christmasYear,
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
