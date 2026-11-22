import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { ACTIVE_GIFT_STATUSES } from "@/lib/gift-status";
import { monthName } from "@/lib/format";

const USERS_PER_PAGE = 200;

type PersonRow = {
  id: string;
  name: string;
  birthday_day: number | null;
};

type GiftRow = {
  title: string;
  status: string;
};

type PersonWithGifts = PersonRow & { gifts: GiftRow[] };

// "Naechster Monat" relativ zu `now`, mit Dezember -> Januar-Umschlag:
// getMonth() ist 0-basiert (11 = Dezember), das Ergebnis ist 1-basiert
// (1 = Januar). Fuer Dezember (getMonth()===11): (11+1)%12+1 = 1.
function nextMonth(now: Date): number {
  return ((now.getMonth() + 1) % 12) + 1;
}

// Schluessel fuer die Dedup-Markierung - der Monat, in dem der Cron
// tatsaechlich LAEUFT (now), nicht der Ziel-Geburtstagsmonat. So laesst
// sich ein zweiter Lauf am selben Tag (z. B. erneuter Vercel-Cron-Trigger)
// erkennen, ohne dass "naechster Monat" zweimal verschieden berechnet
// werden muesste.
function runMonthKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Inline-gestyltes, tabellenbasiertes HTML (E-Mail-Clients unterstuetzen
// kein externes/eingebettetes CSS zuverlaessig, siehe AGENTS.md
// Design-System) - Farben sind die Hex-Werte der "rose"-Standardpalette
// (globals.css), da E-Mail-Clients CSS-Variablen nicht aufloesen.
const EMAIL_COLORS = {
  bg: "#f5eeed",
  card: "#ffffff",
  heading: "#1f1719",
  muted: "#5f5254",
  accent: "#8a3552",
  accentSoft: "rgba(138, 53, 82, 0.09)",
  success: "#3f6b4f",
  successSoft: "rgba(63, 107, 79, 0.12)",
  line: "#dccbc9",
};

function renderGiftsHtml(gifts: GiftRow[]): string {
  if (gifts.length === 0) {
    return `<p style="margin:10px 0 0; font-size:14px; color:${EMAIL_COLORS.muted};">Noch keine Geschenkideen eingetragen.</p>`;
  }

  const rows = gifts
    .map((gift) => {
      const isIdea = gift.status === "idea";
      const statusColor = isIdea ? EMAIL_COLORS.accent : EMAIL_COLORS.success;
      const statusBg = isIdea ? EMAIL_COLORS.accentSoft : EMAIL_COLORS.successSoft;
      return `
        <tr>
          <td style="padding:4px 0; font-size:14px; color:${EMAIL_COLORS.heading};">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:${EMAIL_COLORS.accent}; margin-right:10px;"></span>${gift.title}
            <span style="display:inline-block; margin-left:8px; padding:2px 10px; font-size:11px; font-weight:600; color:${statusColor}; background-color:${statusBg}; border-radius:9999px;">${isIdea ? "offen" : "besorgt"}</span>
          </td>
        </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">${rows}</table>`;
}

function renderPersonRow(person: PersonWithGifts, monthLabel: string): string {
  return `
    <tr>
      <td style="padding-bottom:16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${EMAIL_COLORS.bg}; border-left:4px solid ${EMAIL_COLORS.accent}; border-radius:12px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0; font-size:16px; font-weight:600; color:${EMAIL_COLORS.heading};">${person.name}<span style="font-weight:400; color:${EMAIL_COLORS.accent};"> – ${person.birthday_day}. ${monthLabel}</span></p>
              ${renderGiftsHtml(person.gifts)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderBirthdayEmailHtml(targetMonth: number, people: PersonWithGifts[]): string {
  const monthLabel = monthName(targetMonth);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const settingsUrl = `${siteUrl}/dashboard/einstellungen`;
  const logoUrl = `${siteUrl}/giftwise-symbol-transparent.png`;

  const peopleHtml = people.map((person) => renderPersonRow(person, monthLabel)).join("");

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Geburtstage im ${monthLabel}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${EMAIL_COLORS.bg}; -webkit-text-size-adjust:100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${EMAIL_COLORS.bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:${EMAIL_COLORS.card}; border-radius:20px; border:1px solid ${EMAIL_COLORS.line};">
            <tr>
              <td align="center" style="padding:32px 32px 24px; border-bottom:1px solid ${EMAIL_COLORS.line};">
                <img src="${logoUrl}" width="48" height="48" alt="Giftwise" style="display:block; margin:0 auto 12px;" />
                <div style="font-size:20px; font-weight:300; letter-spacing:0.18em; color:${EMAIL_COLORS.accent};">GIFTWISE</div>
                <div style="font-size:12px; letter-spacing:0.08em; color:${EMAIL_COLORS.muted}; margin-top:4px;">Klug schenken</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px; font-size:16px; color:${EMAIL_COLORS.heading};">Hallo,</p>
                <p style="margin:0 0 24px; font-size:16px; color:${EMAIL_COLORS.heading};">im <strong>${monthLabel}</strong> haben folgende Personen Geburtstag:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${peopleHtml}</table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  <tr>
                    <td align="center">
                      <a href="${settingsUrl}" style="display:inline-block; background-color:${EMAIL_COLORS.accent}; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:12px 28px; border-radius:9999px;">Einstellungen ändern</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 32px 28px; border-top:1px solid ${EMAIL_COLORS.line};">
                <p style="margin:0; font-size:12px; color:${EMAIL_COLORS.muted};">Diese E-Mail wurde automatisch von Geschenke-Manager verschickt.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function processAccount(
  supabase: ReturnType<typeof createServiceClient>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  targetMonth: number,
  currentRunMonthKey: string,
): Promise<void> {
  // Zweiter Lauf im selben Monat (z. B. Cron erneut getriggert) - diesem
  // Konto wurde fuer diesen Monat bereits eine Erinnerung verschickt
  // (oder zumindest geprueft), also ueberspringen, bevor ueberhaupt
  // Personen/Geschenke geladen werden.
  if (user.user_metadata?.last_birthday_reminder_month === currentRunMonthKey) {
    return;
  }

  const { data: people, error: peopleError } = await supabase
    .from("people")
    .select("id, name, birthday_day")
    .eq("user_id", user.id)
    .eq("birthday_month", targetMonth)
    .eq("reminders_enabled", true);

  if (peopleError) {
    throw new Error(`Personen konnten nicht geladen werden: ${peopleError.message}`);
  }

  const peopleList = (people ?? []) as unknown as PersonRow[];

  if (peopleList.length > 0) {
    const peopleWithGifts: PersonWithGifts[] = [];

    for (const person of peopleList) {
      const { data: gifts, error: giftsError } = await supabase
        .from("gifts")
        .select("title, status")
        .eq("person_id", person.id)
        .in("status", ACTIVE_GIFT_STATUSES);

      if (giftsError) {
        throw new Error(`Geschenke konnten nicht geladen werden: ${giftsError.message}`);
      }

      // Zusaetzlich zum .in()-Filter im Query selbst nochmal explizit
      // filtern - "given"-Geschenke (verschenkte/dokumentierte Historie)
      // duerfen unter keinen Umstaenden in der Ideenliste der Mail
      // auftauchen (Datensparsamkeit, siehe gift-status.ts).
      const activeGifts = ((gifts ?? []) as unknown as GiftRow[]).filter((gift) =>
        (ACTIVE_GIFT_STATUSES as readonly string[]).includes(gift.status),
      );

      peopleWithGifts.push({ ...person, gifts: activeGifts });
    }

    // Dynamischer statt statischer Import: "@/lib/resend" instanziiert den
    // Resend-Client bereits beim Modul-Laden (new Resend(...), siehe
    // resend.ts) und wirft dabei ohne RESEND_API_KEY sofort einen Fehler.
    // Ein statischer Import wuerde dieses Modul schon beim Laden von
    // route.ts auswerten (auch wenn kein Job tatsaechlich laeuft, z. B. in
    // route.test.ts) und dort ungewollt crashen, sobald die Umgebung
    // keinen Resend-Key gesetzt hat (z. B. in CI, siehe .github/workflows/
    // ci.yml - der "Test"-Schritt bekommt keinen RESEND_API_KEY).
    const { sendEmail } = await import("@/lib/resend");
    await sendEmail({
      to: user.email ?? "",
      subject: `Geburtstage im ${monthName(targetMonth)}`,
      html: renderBirthdayEmailHtml(targetMonth, peopleWithGifts),
    });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      last_birthday_reminder_month: currentRunMonthKey,
    },
  });

  if (updateError) {
    throw new Error(`Konto konnte nicht aktualisiert werden: ${updateError.message}`);
  }
}

// Monatlicher Job (#2/#3): am 1. jedes Monats erhaelt jedes bestaetigte,
// nicht-Test-Konto mit remind_birthdays!=false eine Mail mit den Personen,
// die im naechsten Monat Geburtstag haben (plus deren offene/besorgte
// Geschenkideen) - Muster fuer Pagination/Fehlersammlung wie
// deleteUnconfirmedAccounts().
export async function sendBirthdayReminders(now: Date = new Date()): Promise<void> {
  if (now.getDate() !== 1) return;

  const supabase = createServiceClient();
  const targetMonth = nextMonth(now);
  const currentRunMonthKey = runMonthKey(now);

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
      const remindBirthdays = user.user_metadata?.remind_birthdays !== false;

      if (isConfirmed && !isTestAccount && remindBirthdays) {
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
      await processAccount(supabase, user, targetMonth, currentRunMonthKey);
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
