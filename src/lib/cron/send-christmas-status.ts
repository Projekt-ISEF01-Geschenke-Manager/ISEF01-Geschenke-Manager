import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { EMAIL_COLORS, renderEmailLayout } from "@/lib/email-layout";

const USERS_PER_PAGE = 200;

// Drei Zieltage pro Saison statt eines Datumsbereichs (A7, #2): je frueher
// im Nov./Dez. ein Erinnerungsschub, desto frueher kann noch eingekauft
// werden - 1. Nov. (frueher Hinweis), 1. Dez. (Monatsbeginn) und 15. Dez.
// (letzte Zaehlung vor Weihnachten). getMonth() ist 0-basiert (10 =
// November, 11 = Dezember).
const CHRISTMAS_TARGET_DATES = [
  { month: 10, day: 1 },
  { month: 11, day: 1 },
  { month: 11, day: 15 },
] as const;

function isTargetDate(now: Date): boolean {
  return CHRISTMAS_TARGET_DATES.some((d) => now.getMonth() === d.month && now.getDate() === d.day);
}

// Schluessel fuer die Dedup-Markierung - bewusst der EXAKTE Kalendertag
// (nicht nur der Monat wie bei sendBirthdayReminders), weil es pro Saison
// drei Zieltage im selben Monat (1.12. und 15.12.) gibt und jeder seinen
// eigenen Dedup-Slot braucht: ein Marker vom 1.12.-Lauf darf den
// 15.12.-Lauf nicht faelschlich unterdruecken.
function runDateKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type PersonStatus = {
  id: string;
  name: string;
  purchased: boolean;
};

type GiftWithPersonRow = {
  person_id: string;
  status: string;
  // Eingebettete 1:1-Relation (gifts.person_id -> people.id) - Supabase
  // liefert dafuer ein einzelnes Objekt, kein Array.
  people: { id: string; name: string; reminders_enabled: boolean } | null;
};

function renderStatusRow(person: PersonStatus): string {
  const statusColor = person.purchased ? EMAIL_COLORS.success : EMAIL_COLORS.accent;
  const statusBg = person.purchased ? EMAIL_COLORS.successSoft : EMAIL_COLORS.accentSoft;
  return `
    <tr>
      <td style="padding:4px 0; font-size:14px; color:${EMAIL_COLORS.heading};">
        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:${EMAIL_COLORS.accent}; margin-right:10px;"></span>${person.name}
        <span style="display:inline-block; margin-left:8px; padding:2px 10px; font-size:11px; font-weight:600; color:${statusColor}; background-color:${statusBg}; border-radius:9999px;">${person.purchased ? "besorgt" : "noch offen"}</span>
      </td>
    </tr>`;
}

function renderChristmasStatusEmailHtml(people: PersonStatus[]): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const purchasedCount = people.filter((p) => p.purchased).length;
  const rows = people.map(renderStatusRow).join("");

  const bodyHtml = `
    <p style="margin:0 0 4px; font-size:16px; color:${EMAIL_COLORS.heading};">Hallo,</p>
    <p style="margin:0 0 24px; font-size:16px; color:${EMAIL_COLORS.heading};"><strong>${purchasedCount} von ${people.length}</strong> Personen sind schon besorgt:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;

  return renderEmailLayout({
    siteUrl,
    title: "Weihnachts-Statusübersicht",
    bodyHtml,
  });
}

async function processAccount(
  supabase: ReturnType<typeof createServiceClient>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  currentRunDateKey: string,
): Promise<void> {
  // Zweiter Lauf am selben Zieltag (z. B. Cron erneut getriggert) - diesem
  // Konto wurde fuer dieses exakte Datum bereits eine Status-Mail
  // verschickt (oder zumindest geprueft), also ueberspringen, bevor
  // ueberhaupt Anlass/Geschenke geladen werden. Siehe runDateKey() zum
  // Grund fuer den Kalendertag statt Monat als Schluessel.
  if (user.user_metadata?.last_christmas_status_date === currentRunDateKey) {
    return;
  }

  const { data: occasion, error: occasionError } = await supabase
    .from("occasions")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Weihnachten")
    .maybeSingle();

  if (occasionError) {
    throw new Error(`Anlass konnte nicht geladen werden: ${occasionError.message}`);
  }

  // Anlass per Namen gesucht, exakt wie das Dashboard (src/app/dashboard/
  // page.tsx, weihnachtenId). Wurde "Weihnachten" umbenannt oder geloescht,
  // findet sich kein Anlass - dafuer ist das kein Fehler, sondern bedeutet
  // nur: dieses Konto bekommt keine Status-Mail (occasion bleibt null, der
  // Block darunter wird uebersprungen).
  if (occasion) {
    const { data: gifts, error: giftsError } = await supabase
      .from("gifts")
      .select("person_id, status, people!inner(id, name, reminders_enabled)")
      .eq("occasion_id", occasion.id)
      .eq("people.reminders_enabled", true);

    if (giftsError) {
      throw new Error(`Geschenke konnten nicht geladen werden: ${giftsError.message}`);
    }

    const giftRows = (gifts ?? []) as unknown as GiftWithPersonRow[];

    // "besorgt" zaehlt EXAKT wie im Dashboard (weihnachtenPurchasedByPerson,
    // src/app/dashboard/page.tsx Zeile ~56-77): nur status === "purchased"
    // zaehlt, "given" NICHT - eine Person, deren einziges
    // Weihnachten-Geschenk schon "given" ist, gilt hier weiterhin als
    // "noch offen", damit die Mail dem Dashboard niemals widerspricht.
    const peopleById = new Map<string, PersonStatus>();
    for (const gift of giftRows) {
      const person = gift.people;
      if (!person) continue;
      const existing = peopleById.get(person.id);
      const purchased = (existing?.purchased ?? false) || gift.status === "purchased";
      peopleById.set(person.id, { id: person.id, name: person.name, purchased });
    }

    const people = [...peopleById.values()];

    if (people.length > 0) {
      // Dynamischer statt statischer Import - siehe send-birthday-
      // reminders.ts fuer die ausfuehrliche Begruendung (resend.ts wirft
      // beim Modul-Laden ohne RESEND_API_KEY, u. a. in CI).
      const { sendEmail } = await import("@/lib/resend");
      await sendEmail({
        to: user.email ?? "",
        subject: "Weihnachts-Statusübersicht",
        html: renderChristmasStatusEmailHtml(people),
      });
    }
  }

  // Dedup-Marker wird IMMER gesetzt, auch wenn kein Anlass gefunden wurde
  // oder niemand ein Weihnachten-Geschenk hat (keine Mail ging raus) -
  // bewusste Entscheidung (siehe Task-Brief, Schritt 4-Hinweis): sonst
  // wuerde ein Konto ohne (mehr) passenden Anlass bei jedem erneuten
  // Trigger desselben Zieltags wieder erfolglos Anlass/Geschenke laden.
  // Der Marker ist rein lauf-bezogen ("wurde fuer dieses Datum bereits
  // geprueft"), nicht "es wurde eine Mail versendet".
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      last_christmas_status_date: currentRunDateKey,
    },
  });

  if (updateError) {
    throw new Error(`Konto konnte nicht aktualisiert werden: ${updateError.message}`);
  }
}

// Taeglicher Job (A7, #2): an drei Zieltagen pro Saison (1. Nov., 1. Dez.,
// 15. Dez.) erhaelt jedes bestaetigte, nicht-Test-Konto mit
// remind_christmas!=false eine Mail mit dem Weihnachts-Besorgungsstatus
// aller Personen, die mindestens ein Weihnachten-Geschenk haben - Muster
// fuer Pagination/Fehlersammlung wie sendBirthdayReminders()/
// deleteUnconfirmedAccounts().
export async function sendChristmasStatusOverview(now: Date = new Date()): Promise<void> {
  if (!isTargetDate(now)) return;

  const supabase = createServiceClient();
  const currentRunDateKey = runDateKey(now);

  const candidates: { id: string; email?: string; user_metadata?: Record<string, unknown> }[] = [];
  let page = 1;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });

    if (error) {
      throw new Error(`Nutzerliste konnte nicht geladen werden: ${error.message}`);
    }

    const users = data.users;
    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      const isConfirmed = !!user.email_confirmed_at;
      const isTestAccount = user.app_metadata?.is_test_account === true;
      const remindChristmas = user.user_metadata?.remind_christmas !== false;

      if (isConfirmed && !isTestAccount && remindChristmas) {
        candidates.push(user);
      }
    }

    page += 1;
  }

  // Jedes Konto einzeln verarbeiten statt beim ersten Fehler abzubrechen,
  // siehe deleteUnconfirmedAccounts() fuer dasselbe Muster.
  const errors: string[] = [];
  for (const user of candidates) {
    try {
      await processAccount(supabase, user, currentRunDateKey);
    } catch (error) {
      errors.push(`${user.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `${errors.length} von ${candidates.length} Konten konnten nicht verarbeitet werden: ${errors.join("; ")}`,
    );
  }
}
