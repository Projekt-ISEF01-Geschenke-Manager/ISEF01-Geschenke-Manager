# Geburtstagserinnerung (#3) + Einstellungsseite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monatlich am 1. erhalten Nutzer:innen mit bestätigtem Konto eine E-Mail mit allen Personen, die im nächsten Monat Geburtstag haben, inkl. deren aktueller Geschenkideen; dazu eine neue Einstellungsseite mit Kontoschaltern (Geburtstag/Weihnachten) und ein Pro-Person-Schalter.

**Architecture:** Neuer Cron-Job (`src/lib/cron/send-birthday-reminders.ts`) im bestehenden täglichen Vercel-Cron-Harness (`runDailyJobs`), nach demselben Muster wie `deleteUnconfirmedAccounts`/`convertPastGifts` (Service-Client, Fehler pro Konto sammeln). Kontoeinstellungen leben in `user_metadata` (kein neuer Tisch), der Pro-Person-Schalter als neue Spalte auf `people`. Eine neue Dashboard-Seite "Einstellungen" (vierter `DashboardNav`-Tab) hält die zwei Kontoschalter.

**Tech Stack:** Next.js Server Actions, Supabase (Postgres + Admin API), Resend (`src/lib/resend.ts`), Vitest.

**Spec:** [docs/superpowers/specs/2026-11-22-email-reminders-design.md](../specs/2026-11-22-email-reminders-design.md)

## Global Constraints

- Täglicher Cron läuft schon um 06:00 UTC (`vercel.json`) - keine neue Cron-Konfiguration, der Job gated intern auf `now.getDate() === 1`.
- `people.reminders_enabled` Default `true`; Konto-Felder `user_metadata.remind_birthdays`/`remind_christmas` gelten als an, solange sie nicht explizit `false` sind (Feld fehlt komplett bei alten Konten → trotzdem an).
- Test-Accounts (`app_metadata.is_test_account === true`) erhalten nie eine Erinnerungs-Mail.
- Unbestätigte Konten (`email_confirmed_at` leer) erhalten nie eine Erinnerungs-Mail.
- Dedup-Marker `user_metadata.last_birthday_reminder_month` im Format `YYYY-MM` (Monat des Cron-Laufs, z. B. `"2026-12"`), verhindert zweiten Versand bei doppeltem Lauf am 1.
- Ideenliste in der Mail filtert ausschließlich auf `ACTIVE_GIFT_STATUSES` (`src/lib/gift-status.ts`) - "given"-Geschenke tauchen nie auf.
- Alle Mail-Texte auf Deutsch.

## Review Focus

- Unchecked "In Erinnerungen einschließen"-Checkbox muss die Person wirklich ausschließen, nicht nur ignoriert werden (Browser sendet unangehakte Checkboxen gar nicht in `FormData`).
- Dezember → Januar: "nächster Monat" darf nicht einfach `month + 1` rechnen (ergäbe 13).
- "given"-Geschenke dürfen nie in der Mail-Ideenliste auftauchen.
- Konto ohne Treffer (niemand hat nächsten Monat Geburtstag) darf keine (leere) Mail bekommen.
- Zweiter Cron-Lauf am selben 1. darf nicht doppelt an dasselbe Konto senden.

---

## Task 1: Migration `people.reminders_enabled`

**Files:**
- Create: `supabase/migrations/20261122120000_people_reminders_enabled.sql`
- Modify: `docs/database-schema.md` (people-Tabelle, Abschnitt 2 und 5)

**Interfaces:**
- Produces: Spalte `public.people.reminders_enabled boolean not null default true`, von allen folgenden Tasks gelesen/geschrieben.

- [ ] **Step 1: Migration schreiben**

```sql
-- ============================================================================
-- Geschenke-Manager: Pro-Person-Schalter fuer E-Mail-Erinnerungen (A6/A7, #3)
-- ============================================================================
-- Ausführliche Erklärung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

alter table public.people
  add column reminders_enabled boolean not null default true;

comment on column public.people.reminders_enabled is
  'Ob diese Person in E-Mail-Erinnerungen (Geburtstag/Weihnachten, A6/A7) auftaucht. Default true, damit sich für bestehende Personen nichts automatisch ändert.';
```

- [ ] **Step 2: Migration anwenden**

Per `apply_migration`-Tool versuchen; wird das (wie bei früheren Migrationen) vom Safety-Classifier blockiert, dem Nutzer die Datei zum manuellen Ausführen im Supabase-Dashboard-SQL-Editor geben.

- [ ] **Step 3: Anwendung verifizieren**

Per `execute_sql` (read-only, nicht blockiert): `select column_name, data_type, column_default from information_schema.columns where table_name = 'people' and column_name = 'reminders_enabled';` - erwartet: eine Zeile, `data_type = boolean`, `column_default` enthält `true`.

- [ ] **Step 4: `docs/database-schema.md` ergänzen**

`people`-Tabellenzeile um `reminders_enabled` (boolean, Default true) ergänzen; in der Anforderungs-Abdeckungstabelle (Abschnitt 5) die Zeile zu A6/A7 von "noch nicht Teil des Schemas" auf den jetzigen Stand aktualisieren.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261122120000_people_reminders_enabled.sql docs/database-schema.md
git commit -m "feat: Pro-Person-Schalter fuer E-Mail-Erinnerungen (Migration)"
```

---

## Task 2: Pro-Person-Schalter im Formular

**Files:**
- Modify: `src/app/actions/people.ts` (`ParsedPerson`, `parsePersonFields`, `toPersonRecord`, `PersonFormState`)
- Modify: `src/components/person-form.tsx` (`EditablePerson`, Checkbox, `initialState`)
- Modify: `src/app/dashboard/personen/[id]/page.tsx:25-26` (Select-Query)
- Test: `src/app/actions/people.test.ts`, `src/components/person-form.test.tsx`

**Interfaces:**
- Consumes: `people.reminders_enabled` (Task 1).
- Produces: `EditablePerson.reminders_enabled: boolean`; `toPersonRecord(data).reminders_enabled: boolean` - von Task 6 (Cron-Job-Query) vorausgesetzt.

- [ ] **Step 1: Fehlschlagenden Test für `parsePersonFields`/`toPersonRecord` schreiben**

In `src/app/actions/people.test.ts`, mit der bestehenden `formData(fields)`-Hilfsfunktion und `validFields`-Fixture dieser Datei:

```ts
it("speichert reminders_enabled=false, wenn die Checkbox nicht angehakt ist", async () => {
  insertMock.mockResolvedValue({ error: null });
  // "remindersEnabled" bewusst nicht in den Feldern (unangehakte Checkbox)
  await createPerson(undefined, formData(validFields));
  expect(insertMock).toHaveBeenCalledWith(
    "people",
    expect.objectContaining({ reminders_enabled: false }),
  );
});

it("speichert reminders_enabled=true, wenn die Checkbox angehakt ist", async () => {
  insertMock.mockResolvedValue({ error: null });
  await createPerson(undefined, formData({ ...validFields, remindersEnabled: "on" }));
  expect(insertMock).toHaveBeenCalledWith(
    "people",
    expect.objectContaining({ reminders_enabled: true }),
  );
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/app/actions/people.test.ts`
Expected: FAIL (Property `reminders_enabled` fehlt im aufgerufenen Objekt)

- [ ] **Step 3: `parsePersonFields`/`toPersonRecord` erweitern**

In `parsePersonFields`: `const remindersEnabled = formData.has("remindersEnabled");` - in `values` und `data` (Typ `ParsedPerson`) aufnehmen. In `toPersonRecord`: `reminders_enabled: data.remindersEnabled` ergänzen. `PersonFormState["values"]` um `remindersEnabled: boolean` erweitern.

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/app/actions/people.test.ts`
Expected: PASS

- [ ] **Step 5: Fehlschlagenden Test für `PersonForm` schreiben**

In `src/components/person-form.test.tsx`:

```ts
it("zeigt die Checkbox 'In Erinnerungen einschließen', per Default angehakt", () => {
  render(<PersonForm />);
  expect(
    (screen.getByLabelText(/in erinnerungen einschließen/i) as HTMLInputElement).checked,
  ).toBe(true);
});

it("übernimmt reminders_enabled=false einer bestehenden Person als nicht angehakt", () => {
  render(
    <PersonForm
      person={{
        id: "1",
        name: "Oma Erna",
        birthday_day: null,
        birthday_month: null,
        birthday_year: null,
        interests: [],
        notes: null,
        reminders_enabled: false,
      }}
    />,
  );
  expect(
    (screen.getByLabelText(/in erinnerungen einschließen/i) as HTMLInputElement).checked,
  ).toBe(false);
});
```

- [ ] **Step 6: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/components/person-form.test.tsx`
Expected: FAIL (Label nicht gefunden / `EditablePerson` hat kein `reminders_enabled`)

- [ ] **Step 7: `EditablePerson` + Checkbox implementieren**

`EditablePerson` um `reminders_enabled: boolean` erweitern. Im Formular (unterhalb des Notiz-Felds, vor dem Submit-Button) eine Checkbox ergänzen:

```tsx
<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    name="remindersEnabled"
    defaultChecked={person ? person.reminders_enabled : true}
  />
  In Erinnerungen einschließen
</label>
```

- [ ] **Step 8: Test laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/components/person-form.test.tsx`
Expected: PASS

- [ ] **Step 9: Select-Query der Personenseite erweitern**

`src/app/dashboard/personen/[id]/page.tsx:25-26`: `"id, name, birthday_day, birthday_month, birthday_year, interests, notes"` → `"id, name, birthday_day, birthday_month, birthday_year, interests, notes, reminders_enabled"`.

- [ ] **Step 10: Vollen Testlauf + Build prüfen**

Run: `npm test && npm run build`
Expected: alle Tests grün, Build ohne Typfehler (neues Feld ist überall durchgereicht)

- [ ] **Step 11: Commit**

```bash
git add src/app/actions/people.ts src/app/actions/people.test.ts src/components/person-form.tsx src/components/person-form.test.tsx src/app/dashboard/personen/\[id\]/page.tsx
git commit -m "feat: Pro-Person-Schalter fuer E-Mail-Erinnerungen im Formular"
```

---

## Task 3: Server Action für Kontoeinstellungen

**Files:**
- Create: `src/app/actions/settings.ts`
- Test: `src/app/actions/settings.test.ts`

**Interfaces:**
- Produces: `updateReminderSettings(_prevState: ReminderSettingsState, formData: FormData): Promise<ReminderSettingsState>`, `ReminderSettingsState = { error?: string; success?: boolean } | undefined` - von Task 4 (Formular) konsumiert.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```ts
it("speichert remind_birthdays=false und remind_christmas=true", async () => {
  const formData = new FormData();
  formData.set("remindChristmas", "on");
  // remindBirthdays bewusst nicht gesetzt
  await updateReminderSettings(undefined, formData);
  expect(updateUserMock).toHaveBeenCalledWith({
    data: { remind_birthdays: false, remind_christmas: true },
  });
});

it("gibt einen Fehler zurück, wenn Supabase einen Fehler liefert", async () => {
  updateUserMock.mockResolvedValue({ error: { message: "kaputt" } });
  const result = await updateReminderSettings(undefined, new FormData());
  expect(result?.error).toBe("kaputt");
});
```

(Mock-Aufbau wie in `src/app/actions/auth.test.ts` für `supabase.auth.updateUser`.)

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/app/actions/settings.test.ts`
Expected: FAIL (Modul existiert nicht)

- [ ] **Step 3: `updateReminderSettings` implementieren**

```ts
"use server";
import { createClient } from "@/lib/supabase/server";

export type ReminderSettingsState = { error?: string; success?: boolean } | undefined;

export async function updateReminderSettings(
  _prevState: ReminderSettingsState,
  formData: FormData,
): Promise<ReminderSettingsState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      remind_birthdays: formData.has("remindBirthdays"),
      remind_christmas: formData.has("remindChristmas"),
    },
  });
  if (error) return { error: error.message };
  return { success: true };
}
```

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/app/actions/settings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/settings.ts src/app/actions/settings.test.ts
git commit -m "feat: Server Action fuer Erinnerungs-Kontoeinstellungen"
```

---

## Task 4: Einstellungsseite

**Files:**
- Create: `src/app/dashboard/einstellungen/page.tsx`
- Create: `src/components/reminder-settings-form.tsx`
- Test: `src/components/reminder-settings-form.test.tsx`

**Interfaces:**
- Consumes: `updateReminderSettings` (Task 3).
- Produces: Route `/dashboard/einstellungen` - von Task 5 (Nav-Tab) verlinkt.

- [ ] **Step 1: Fehlschlagenden Test für `ReminderSettingsForm` schreiben**

```ts
it("zeigt beide Schalter mit den übergebenen Anfangswerten", () => {
  render(
    <ReminderSettingsForm initialRemindBirthdays={false} initialRemindChristmas={true} />,
  );
  expect(
    (screen.getByLabelText(/geburtstagserinnerung/i) as HTMLInputElement).checked,
  ).toBe(false);
  expect(
    (screen.getByLabelText(/weihnachts-statusübersicht/i) as HTMLInputElement).checked,
  ).toBe(true);
});
```

(Mock von `@/app/actions/settings` analog zu `person-form.test.tsx`.)

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/components/reminder-settings-form.test.tsx`
Expected: FAIL (Komponente existiert nicht)

- [ ] **Step 3: `ReminderSettingsForm` implementieren**

`"use client"`-Komponente mit `useActionState(updateReminderSettings, undefined)`, Props `{ initialRemindBirthdays: boolean; initialRemindChristmas: boolean }`, zwei Checkboxen (`name="remindBirthdays"`/`"remindChristmas"`, `defaultChecked` aus den Props), Submit-Button `btn btn-primary` ("Speichern"), Erfolgs-/Fehlermeldung wie in `PersonForm` (`state?.error`/`state?.success`).

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/components/reminder-settings-form.test.tsx`
Expected: PASS

- [ ] **Step 5: Seite implementieren**

```tsx
export const instant = false;
// Server Component: liest den eigenen Nutzer, übergibt die beiden
// aktuellen Werte an das Client-Formular.
```

Liest `supabase.auth.getUser()`, berechnet `remindBirthdays = user.user_metadata?.remind_birthdays !== false` (analog für Christmas), rendert `<ReminderSettingsForm initialRemindBirthdays={remindBirthdays} initialRemindChristmas={remindChristmas} />` in einer `surface`-Karte mit Überschrift "Einstellungen" (Design-System-Konventionen aus `DESIGN-DARKMODE.md`).

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/einstellungen/page.tsx src/components/reminder-settings-form.tsx src/components/reminder-settings-form.test.tsx
git commit -m "feat: Einstellungsseite mit Erinnerungs-Schaltern"
```

---

## Task 5: Einstellungen erreichbar machen (Desktop: Header-Icon, Mobile: vierter Tab)

**Files:**
- Modify: `src/components/site-header.tsx` (Desktop-Icon-Link neben "Abmelden")
- Modify: `src/components/dashboard-nav.tsx` (`SETTINGS_TAB`, mobile Tabbar-Liste, `activeKey`)
- Modify: `src/app/globals.css:983` (`.tabbar-glider` Breite)

**Interfaces:**
- Consumes: Route `/dashboard/einstellungen` (Task 4).

**Nutzer-Vorgabe (ersetzt die ursprüngliche "vierter Haupt-Tab auf allen Breakpoints"-Idee):** Auf dem Desktop taucht "Einstellungen" NICHT als vierter Tab in der Haupt-Navigation (`DashboardNav`) auf, sondern als eigenes Icon oben rechts im Header, neben "Abmelden" (`src/components/site-header.tsx`, gleicher Button-Stil, Container `<div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">`). Auf Mobile bleibt es ein vierter Eintrag in der unteren schwebenden Tabbar (wie ursprünglich geplant).

- [ ] **Step 1: Settings-Icon-Link im Header (Desktop)**

In `src/components/site-header.tsx`, im Container `<div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">` (neben dem Abmelden-`<form>`), einen neuen `Link` zu `/dashboard/einstellungen` einfügen - NUR auf Desktop sichtbar (`hidden sm:inline-flex`), gleicher Icon-Button-Stil wie der Abmelden-Button (`rounded-full border border-on-header-btn-border ... hover:bg-on-header-btn-bg`), mit `Settings`-Icon aus `lucide-react`. Exakte Reihenfolge relativ zu `PalettePicker`/`ThemeToggle` nach Augenmaß - Hauptsache neben Abmelden, nicht verdeckt von "Angemeldet als ...".

- [ ] **Step 2: Mobile Tabbar um "Einstellungen" erweitern, ohne Desktop-Tab zu duplizieren**

In `src/components/dashboard-nav.tsx`: bestehendes `TABS`-Array (3 Einträge) bleibt unverändert und wird weiterhin unverändert für den Desktop-`<nav>`-Block (`hidden gap-1 sm:flex`) verwendet - dort erscheint "Einstellungen" NICHT (steht ja schon im Header). Neue Konstante danach:

```tsx
const SETTINGS_TAB = { key: "einstellungen", href: "/dashboard/einstellungen", label: "Einstellungen", Icon: Settings };
const MOBILE_TABS = [...TABS, SETTINGS_TAB];
```

(`Settings` zum bestehenden `lucide-react`-Import hinzufügen.) Im mobilen Tabbar-Block (aktuell `grid grid-cols-3`, iteriert über `TABS`) stattdessen über `MOBILE_TABS` iterieren, `grid-cols-3` → `grid-cols-4`. In `activeKey()`: `if (pathname.startsWith("/dashboard/einstellungen")) return "einstellungen";` ergänzen (wird für das mobile Tabbar-Highlight gebraucht; der Desktop-`nav-glider`-Effekt findet dafür einfach keinen passenden Link und bewegt sich nicht - erwartet, da "einstellungen" auf Desktop kein Tab ist).

- [ ] **Step 3: `.tabbar-glider`-Breite anpassen**

`src/app/globals.css:983`: `width: calc(100% / 3);` → `width: calc(100% / 4);` (gilt weiterhin nur für die mobile, jetzt mit 4 statt 3 Einträgen gefüllte Tabbar).

- [ ] **Step 4: Manuell verifizieren**

`npm run dev`, `/dashboard` öffnen:
- Desktop-Breite: Settings-Icon oben rechts neben "Abmelden" sichtbar, Klick führt zu `/dashboard/einstellungen`; Haupt-Navigation hat weiterhin nur 3 Tabs, gleitende Markierung funktioniert wie vorher.
- Mobile-Breite: untere Tabbar hat jetzt 4 Einträge inkl. "Einstellungen", gleitende Markierung springt beim Wechsel korrekt auf alle vier Positionen inkl. Einstellungen, kein Layout-Sprung.

- [ ] **Step 5: Commit**

```bash
git add src/components/site-header.tsx src/components/dashboard-nav.tsx src/app/globals.css
git commit -m "feat: Einstellungen im Header (Desktop) und als vierten Mobile-Tab erreichbar machen"
```

---

## Task 6: Cron-Job `send-birthday-reminders`

**Files:**
- Modify: `src/lib/format.ts` (neuer Export `monthName`)
- Create: `src/lib/cron/send-birthday-reminders.ts`
- Test: `src/lib/cron/send-birthday-reminders.test.ts`
- Modify: `src/app/api/cron/daily/route.ts` (`DAILY_JOBS`)

**Interfaces:**
- Consumes: `people.reminders_enabled` (Task 1), `ACTIVE_GIFT_STATUSES` (`src/lib/gift-status.ts`), `sendEmail` (`src/lib/resend.ts`), `createServiceClient` (`src/lib/supabase/service.ts`).
- Produces: `sendBirthdayReminders(now?: Date): Promise<void>` - von `DAILY_JOBS` aufgerufen (Muster wie `convertPastGifts`).

- [ ] **Step 1: `monthName` in `format.ts` exportieren**

`MONTH_NAMES` bleibt, neue Funktion danach: `export function monthName(month: number): string { return MONTH_NAMES[month - 1]; }`.

- [ ] **Step 2: Fehlschlagende Tests für `sendBirthdayReminders` schreiben**

In `src/lib/cron/send-birthday-reminders.test.ts` (Mock-Aufbau wie `delete-unconfirmed-accounts.test.ts`: `listUsersMock`, zusätzlich `updateUserByIdMock`, dazu Mocks für `supabase.from("people")...`-Kette und `sendEmail`):

```ts
it("tut nichts, wenn heute nicht der 1. ist", async () => {
  await sendBirthdayReminders(new Date("2026-12-15"));
  expect(listUsersMock).not.toHaveBeenCalled();
});

it("verschickt eine Mail mit Personen, die im naechsten Monat Geburtstag haben (Dezember -> Januar)", async () => {
  // listUsersMock liefert ein bestaetigtes, nicht-Test-Konto zurueck;
  // peopleMock liefert eine Person mit birthday_month=1;
  // gewaehlter now: new Date("2026-12-01")
  await sendBirthdayReminders(new Date("2026-12-01"));
  expect(sendEmailMock).toHaveBeenCalledWith(
    expect.objectContaining({ subject: "Geburtstage im Januar" }),
  );
});

it("ueberspringt Personen mit reminders_enabled=false", async () => { ... erwartet: Person taucht nicht in der gerenderten Mail (HTML) auf, bzw. kein sendEmail, wenn das die einzige Person war });

it("ueberspringt Konten mit remind_birthdays=false", async () => { ... expect(sendEmailMock).not.toHaveBeenCalled(); });

it("ueberspringt Test-Accounts", async () => { ... app_metadata.is_test_account=true ... expect(sendEmailMock).not.toHaveBeenCalled(); });

it("ueberspringt unbestaetigte Konten", async () => { ... email_confirmed_at=null ... expect(sendEmailMock).not.toHaveBeenCalled(); });

it("verschickt keine Mail, wenn niemand naechsten Monat Geburtstag hat", async () => { ... peopleMock liefert leere Liste ... expect(sendEmailMock).not.toHaveBeenCalled(); });

it("laesst 'given'-Geschenke aus der Ideenliste der Mail weg", async () => { ... giftsMock liefert ein Geschenk mit status='given' und eins mit status='idea' ... erwartet: nur der Titel des 'idea'-Geschenks im html-Parameter von sendEmail });

it("setzt last_birthday_reminder_month und ueberspringt beim zweiten Lauf im selben Monat", async () => {
  // erster Lauf: now=new Date("2026-12-01"), erwartet updateUserByIdMock-Aufruf mit user_metadata.last_birthday_reminder_month="2026-12"
  // zweiter Aufruf von sendBirthdayReminders mit now=new Date("2026-12-01"), aber listUsersMock liefert diesmal den User MIT last_birthday_reminder_month="2026-12"
  // erwartet: kein sendEmailMock-Aufruf im zweiten Lauf
});
```

- [ ] **Step 3: Tests laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/lib/cron/send-birthday-reminders.test.ts`
Expected: FAIL (Modul existiert nicht)

- [ ] **Step 4: `sendBirthdayReminders` implementieren**

```ts
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/resend";
import { ACTIVE_GIFT_STATUSES } from "@/lib/gift-status";
import { monthName } from "@/lib/format";

export async function sendBirthdayReminders(now: Date = new Date()): Promise<void> {
  if (now.getDate() !== 1) return;
  // ... Pagination wie deleteUnconfirmedAccounts, Kandidaten filtern,
  // pro Konto people (birthday_month=naechsterMonat, reminders_enabled=true)
  // + je Person gifts (status in ACTIVE_GIFT_STATUSES) laden, HTML bauen,
  // sendEmail, danach user_metadata.last_birthday_reminder_month setzen
  // (admin.updateUserById), Fehler pro Konto sammeln (Muster wie
  // deleteUnconfirmedAccounts), am Ende gebuendelt werfen.
}
```

"Nächster Monat" exakt: `const targetMonth = (now.getMonth() + 1) % 12 + 1;` (Dezember, `getMonth()===11` → `(11+1)%12+1 = 1` = Januar).

Der Service-Client umgeht RLS komplett (kein `auth.uid()`) - die `user_id`-Filterung muss deshalb explizit im Code passieren, pro Konto:

```ts
const { data: people } = await supabase
  .from("people")
  .select("id, name, birthday_day")
  .eq("user_id", candidateUser.id)
  .eq("birthday_month", targetMonth)
  .eq("reminders_enabled", true);
```

Pro gefundener Person danach deren Ideen (ebenfalls durch `person_id` implizit auf diese Person beschränkt, kein zusätzlicher `user_id`-Filter nötig):

```ts
const { data: gifts } = await supabase
  .from("gifts")
  .select("title, status")
  .eq("person_id", person.id)
  .in("status", ACTIVE_GIFT_STATUSES);
```

Mail-HTML pro Konto (eine Mail für alle Treffer dieses Kontos):

```
Betreff: Geburtstage im {monthName(targetMonth)}

Hallo,

im {monthName(targetMonth)} haben folgende Personen Geburtstag:

{je Person:}
{Name} – {Tag}. {monthName(targetMonth)}
{je Idee dieser Person:}
  • {Titel} ({status === "idea" ? "offen" : "besorgt"})

Einstellungen ändern: {process.env.NEXT_PUBLIC_SITE_URL}/dashboard/einstellungen
```

- [ ] **Step 5: Tests laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/lib/cron/send-birthday-reminders.test.ts`
Expected: PASS

- [ ] **Step 6: In `DAILY_JOBS` eintragen**

`src/app/api/cron/daily/route.ts`: Import + `{ name: "send-birthday-reminders", run: sendBirthdayReminders }` zu `DAILY_JOBS` hinzufügen; den Kommentar "Weitere folgen: E-Mail-Erinnerungen #84/#2/#3" auf "#2 (Weihnachts-Status) folgt" kürzen.

- [ ] **Step 7: Vollen Testlauf + Build prüfen**

Run: `npm test && npm run build`
Expected: alle Tests grün, Build ohne Typfehler

- [ ] **Step 8: Commit**

```bash
git add src/lib/format.ts src/lib/cron/send-birthday-reminders.ts src/lib/cron/send-birthday-reminders.test.ts src/app/api/cron/daily/route.ts
git commit -m "feat: Geburtstagserinnerung per E-Mail (A6, #3)"
```

---

## Nacharbeiten (nicht Teil dieses Plans)

- Issue #2 (Weihnachts-Statusübersicht) reicht in seinem eigenen PR `remind_christmas` und `people.reminders_enabled` nach.
- Issue #209 (manueller "Bewegung reduzieren"-Schalter) baut auf der hier entstehenden Einstellungsseite auf.
- README "Stand des Projekts" / Issue #3 schließen, sobald dieser PR gemergt ist.
