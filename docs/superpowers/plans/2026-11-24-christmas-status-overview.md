# Weihnachts-Statusübersicht (#2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Am 1. November, 1. Dezember und 15. Dezember erhalten Nutzer:innen mit bestätigtem Konto und `remind_christmas !== false` eine E-Mail mit dem Status ("besorgt"/"noch offen") aller Personen, für die mindestens ein Weihnachten-Geschenk existiert - identische Statuslogik wie das bestehende Dashboard. Zusätzlich wird das gestylte E-Mail-Layout, das für die Geburtstagserinnerung entworfen, aber nie nach `main` gemergt wurde, als gemeinsames Modul wiederhergestellt und von beiden Mail-Typen genutzt.

**Architecture:** Neues Modul `src/lib/email-layout.ts` kapselt den visuellen Rahmen (Logo, "GIFTWISE"-Kopf, Karte, Einstellungen-Button, Fuß) beider Mail-Typen. `src/lib/cron/send-birthday-reminders.ts` wird darauf umgestellt (reiner Refactor). Neuer Cron-Job `src/lib/cron/send-christmas-status.ts` nach demselben Harness-Muster wie `sendBirthdayReminders`/`deleteUnconfirmedAccounts` (Service-Client, Fehler pro Konto sammeln, `DAILY_JOBS`-Eintrag).

**Tech Stack:** Next.js Server Actions/Cron, Supabase (Postgres + Admin API), Resend (`src/lib/resend.ts`), Vitest.

**Spec:** [docs/superpowers/specs/2026-11-24-christmas-status-overview-design.md](../specs/2026-11-24-christmas-status-overview-design.md)

## Wichtiger Kontext für den:die Umsetzer:in

Die Commits `7e0b9cb` und `8c8f093` auf dem (bereits gemergten, toten) Branch `worktree-feature+geburtstagserinnerung` enthalten ein bereits fertig entworfenes, gestyltes HTML-Layout für die Geburtstagsmail (Logo, "klassisch"-Palette, Pill-Button) - dieses wurde nie nach `main` gemergt, weil die Design-Commits erst NACH dem Merge von PR #210 gepusht wurden. `main` liefert aktuell nur die einfache, ungestylte `<p>`-Tag-Version aus. Task 1 holt dieses Design nach (per `git show 8c8f093:src/lib/cron/send-birthday-reminders.ts` einsehbar) und extrahiert gleichzeitig den wiederverwendbaren Teil in `email-layout.ts` - kein Neuentwurf nötig, nur Wiederherstellung + Extraktion.

## Global Constraints

- Täglicher Cron läuft schon um 06:00 UTC (`vercel.json`) - keine neue Cron-Konfiguration; `sendChristmasStatusOverview` gated intern auf die drei Zieltage.
- `reminders_enabled` (Default `true`) und `remind_christmas !== false` gelten exakt wie bei der Geburtstagserinnerung (siehe `send-birthday-reminders.ts`).
- Test-Accounts (`app_metadata.is_test_account === true`) und unbestätigte Konten (`email_confirmed_at` leer) erhalten nie eine Mail.
- Dedup-Marker `user_metadata.last_christmas_status_date` im Format `YYYY-MM-DD` (exaktes Datum, nicht Monat - drei Termine pro Saison).
- Status pro Person = `true`, sobald mindestens ein Weihnachten-Geschenk den Status `purchased` hat - exakt die Logik aus `src/app/dashboard/page.tsx` (`weihnachtenPurchasedByPerson`), nicht neu erfunden.
- Kein Weihnachten-Anlass für ein Konto gefunden (umbenannt/gelöscht) → keine Mail für dieses Konto, kein Fehler.
- Konto ohne jede Person mit Weihnachten-Geschenk → keine (leere) Mail.
- Der bestehende Test `send-birthday-reminders.test.ts` muss nach dem Refactor in Task 1 unverändert grün bleiben (Subject-Text und die beiden `toContain`/`not.toContain`-Assertions auf Geschenktitel sind die einzigen HTML-bezogenen Prüfungen - der Refactor darf daran nichts ändern).

## Review Focus

- Die Statuslogik ("besorgt" = mindestens ein `purchased`-Geschenk) muss exakt der Dashboard-Logik entsprechen, nicht einer neuen/anderen Definition folgen.
- Die drei Zieltage (1.11., 1.12., 15.12.) müssen einzeln geprüft werden - nicht "ab dem 1.11. bis 15.12." oder ähnliche Bereichsprüfungen.
- Dedup muss pro exaktem Kalenderdatum funktionieren, nicht pro Monat (sonst würde z. B. der 15.12.-Lauf durch den 1.12.-Dedup-Marker fälschlich übersprungen).
- "given"-Status zählt NICHT als "besorgt" in der binären Personen-Statuslogik (exakt wie im Dashboard) - das ist bewusst so übernommen, keine Abweichung einbauen.
- Der Refactor in Task 1 darf das Verhalten/die Testergebnisse der Geburtstagsmail nicht verändern.

---

## Task 1: Gemeinsames E-Mail-Layout wiederherstellen und extrahieren

**Files:**
- Create: `src/lib/email-layout.ts`
- Modify: `src/lib/cron/send-birthday-reminders.ts`
- Test: `src/lib/cron/send-birthday-reminders.test.ts` (nur prüfen, nicht inhaltlich ändern - siehe Global Constraints)

**Interfaces:**
- Produces: `renderEmailLayout({ title, bodyHtml }): string` (oder ähnliche Signatur - exakter Zuschnitt dem:der Umsetzer:in überlassen, siehe unten), von Task 2 konsumiert.

- [ ] **Step 1: Gestyltes Layout ansehen**

`git show 8c8f093:src/lib/cron/send-birthday-reminders.ts` zeigt die vollständige, bereits fertig gebaute Vorlage (siehe auch "Wichtiger Kontext" oben) - `EMAIL_COLORS`, `renderGiftsHtml`, `renderPersonRow`, `renderBirthdayEmailHtml`. Das ist die Zielvorlage, kein Neuentwurf.

- [ ] **Step 2: `email-layout.ts` erstellen**

Extrahiert aus der gezeigten Vorlage den Teil, der NICHT geburtstagsspezifisch ist: `EMAIL_COLORS`, der komplette HTML-Rahmen (`<!doctype html>` bis `</html>`, Logo/Kopf/Fuß/Einstellungen-Button), parametrisiert über `siteUrl`, einen `bodyHtml`-String (das Hauptinhalt-Fragment, z. B. die Begrüßung + Personenliste) und einen `<title>`-Text. Exportiert außerdem `EMAIL_COLORS` selbst, damit Task 2 dieselben Farben für eigene Inline-Styles (Status-Badges o. Ä.) verwenden kann.

- [ ] **Step 3: `send-birthday-reminders.ts` auf das neue Modul umstellen**

`renderBirthdayEmailHtml` nutzt jetzt `email-layout.ts` für den Rahmen und behält nur noch die geburtstagsspezifische Logik (`renderGiftsHtml`, `renderPersonRow`, die Begrüßungs-/Personenliste). `EMAIL_COLORS` wird aus `email-layout.ts` importiert statt lokal definiert.

- [ ] **Step 4: Bestehende Tests laufen lassen, unverändert grün**

Run: `npm test -- src/lib/cron/send-birthday-reminders.test.ts`
Expected: PASS, alle 9 Tests wie zuvor, keine Testdatei-Änderung nötig (Subject-Text und Gift-Title-Assertions bleiben identisch erfüllbar).

- [ ] **Step 5: Vollen Testlauf + Build prüfen**

Run: `npm test && npm run build`
Expected: alle Tests grün, Build ohne Typfehler.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email-layout.ts src/lib/cron/send-birthday-reminders.ts
git commit -m "feat: Gestyltes E-Mail-Layout wiederhergestellt und in email-layout.ts extrahiert"
```

---

## Task 2: Cron-Job `send-christmas-status`

**Files:**
- Create: `src/lib/cron/send-christmas-status.ts`
- Test: `src/lib/cron/send-christmas-status.test.ts`
- Modify: `src/app/api/cron/daily/route.ts` (`DAILY_JOBS`)

**Interfaces:**
- Consumes: `email-layout.ts` (Task 1), `createServiceClient` (`src/lib/supabase/service.ts`), `sendEmail` (`src/lib/resend.ts`, dynamischer Import wie bei `sendBirthdayReminders` - gleicher Grund: `resend.ts` wirft ohne `RESEND_API_KEY` beim Laden).
- Produces: `sendChristmasStatusOverview(now?: Date): Promise<void>` - von `DAILY_JOBS` aufgerufen.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

In `src/lib/cron/send-christmas-status.test.ts` (Mock-Aufbau wie `send-birthday-reminders.test.ts`: `listUsersMock`, `updateUserByIdMock`, Mocks für `supabase.from("occasions")`/`supabase.from("gifts")`-Ketten, `sendEmail`):

```ts
it("tut nichts, wenn heute keiner der drei Zieltage ist", async () => {
  await sendChristmasStatusOverview(new Date("2026-11-02"));
  expect(listUsersMock).not.toHaveBeenCalled();
});

it.each([
  ["2026-11-01"],
  ["2026-12-01"],
  ["2026-12-15"],
])("laeuft am Zieltag %s", async (dateStr) => {
  // listUsersMock liefert ein bestaetigtes, nicht-Test-Konto;
  // occasions-Mock liefert { id: "occ-1" } fuer name="Weihnachten";
  // gifts-Mock liefert eine Person mit einem purchased-Geschenk
  await sendChristmasStatusOverview(new Date(dateStr));
  expect(sendEmailMock).toHaveBeenCalledWith(
    expect.objectContaining({ subject: expect.stringContaining("Weihnachts-Statusübersicht") }),
  );
});

it("ueberspringt Personen mit reminders_enabled=false", async () => { /* Person taucht nicht in der Mail auf bzw. kein sendEmail, wenn das die einzige Person war */ });

it("ueberspringt Konten mit remind_christmas=false", async () => { expect(sendEmailMock).not.toHaveBeenCalled(); });

it("ueberspringt Test-Accounts", async () => { /* app_metadata.is_test_account=true */ expect(sendEmailMock).not.toHaveBeenCalled(); });

it("ueberspringt unbestaetigte Konten", async () => { expect(sendEmailMock).not.toHaveBeenCalled(); });

it("verschickt keine Mail, wenn kein Weihnachten-Anlass existiert (umbenannt/geloescht)", async () => {
  // occasions-Mock liefert null/leer fuer name="Weihnachten"
  expect(sendEmailMock).not.toHaveBeenCalled();
});

it("verschickt keine Mail, wenn niemand ein Weihnachten-Geschenk hat", async () => {
  // occasions-Mock liefert eine ID, gifts-Mock liefert leere Liste
  expect(sendEmailMock).not.toHaveBeenCalled();
});

it("zeigt 'besorgt' nur bei mindestens einem purchased-Geschenk, 'given' zaehlt nicht mit", async () => {
  // Person A: ein Geschenk status='purchased' -> "besorgt"
  // Person B: ein Geschenk status='given', kein 'purchased' -> "noch offen"
  // beide im html-Parameter von sendEmail pruefen
});

it("setzt last_christmas_status_date und ueberspringt beim zweiten Lauf am selben Tag", async () => {
  // erster Lauf: now=new Date("2026-12-01"), erwartet updateUserByIdMock mit
  // user_metadata.last_christmas_status_date="2026-12-01"
  // zweiter Aufruf mit now=new Date("2026-12-01"), aber listUsersMock liefert
  // diesmal den User MIT last_christmas_status_date="2026-12-01" ->
  // kein sendEmailMock-Aufruf im zweiten Lauf
});

it("ueberspringt den Dedup-Marker eines ANDEREN Zieltags (z. B. 1.12. blockiert den 15.12.-Lauf nicht)", async () => {
  // User hat last_christmas_status_date="2026-12-01", Lauf mit now=new Date("2026-12-15")
  // -> sendEmailMock WIRD aufgerufen (unterschiedliche Daten, kein Dedup-Treffer)
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/lib/cron/send-christmas-status.test.ts`
Expected: FAIL (Modul existiert nicht)

- [ ] **Step 3: `sendChristmasStatusOverview` implementieren**

```ts
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { renderEmailLayout, EMAIL_COLORS } from "@/lib/email-layout"; // exakte Namen aus Task 1

const CHRISTMAS_TARGET_DATES = [
  { month: 10, day: 1 },  // November (0-basiert: 10)
  { month: 11, day: 1 },  // Dezember
  { month: 11, day: 15 }, // Dezember
];

function isTargetDate(now: Date): boolean {
  return CHRISTMAS_TARGET_DATES.some(
    (d) => now.getMonth() === d.month && now.getDate() === d.day,
  );
}

function runDateKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ... processAccount(supabase, user, currentRunDateKey):
//   if (user.user_metadata?.last_christmas_status_date === currentRunDateKey) return;
//   const { data: occasion } = await supabase.from("occasions").select("id")
//     .eq("user_id", user.id).eq("name", "Weihnachten").maybeSingle();
//   if (!occasion) { /* trotzdem Dedup-Marker setzen, siehe Step 4 Hinweis */ return; }
//   const { data: gifts } = await supabase.from("gifts")
//     .select("person_id, status, people!inner(id, name, reminders_enabled)")
//     .eq("occasion_id", occasion.id).eq("people.reminders_enabled", true);
//   -> pro person_id: purchased = gifts.some(g => g.person_id === p && g.status === "purchased")
//   -> wenn keine Personen uebrig: return (keine Mail, aber Dedup-Marker setzen)
//   -> sonst: sendEmail(...) mit Betreff "Weihnachts-Statusübersicht", dann Dedup-Marker setzen

export async function sendChristmasStatusOverview(now: Date = new Date()): Promise<void> {
  if (!isTargetDate(now)) return;
  // ... Pagination/Fehlersammlung exakt wie sendBirthdayReminders, Filter:
  // isConfirmed && !isTestAccount && (user.user_metadata?.remind_christmas !== false)
}
```

Mail-HTML pro Konto (Platzhalter-Text, Feinschliff beim Bauen, Status-Badges im selben Stil wie die Geburtstagsmail - `EMAIL_COLORS.success`/`successSoft` für "besorgt", `EMAIL_COLORS.accent`/`accentSoft` für "noch offen"):

```
Betreff: Weihnachts-Statusübersicht

Hallo,

{purchasedCount} von {totalCount} Personen sind schon besorgt:

{je Person:}
{Name} – {"besorgt" oder "noch offen"}

Einstellungen ändern: {siteUrl}/dashboard/einstellungen
```

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/lib/cron/send-christmas-status.test.ts`
Expected: PASS. Falls der "kein Weihnachten-Anlass"-Test und der Dedup-Test in Konflikt geraten (Dedup-Marker setzen, obwohl keine Mail ging) - eigene Einschätzung: sinnvoll ist, den Dedup-Marker auch beim "keine Mail"-Fall zu setzen, damit ein Konto ohne Weihnachten-Anlass nicht bei jedem taeglichen Cron-Lauf erneut (erfolglos) geprueft wird. Kurz im Report begruenden, falls anders geloest.

- [ ] **Step 5: In `DAILY_JOBS` eintragen**

`src/app/api/cron/daily/route.ts`: Import + `{ name: "send-christmas-status", run: sendChristmasStatusOverview }` zu `DAILY_JOBS` hinzufügen; den Kommentar zu offenen Erinnerungs-Features entsprechend aktualisieren/entfernen (prüfen, ob dort noch "#2 folgt" o. Ä. steht).

- [ ] **Step 6: Vollen Testlauf + Build prüfen**

Run: `npm test && npm run build`
Expected: alle Tests grün, Build ohne Typfehler.

- [ ] **Step 7: Commit**

```bash
git add src/lib/cron/send-christmas-status.ts src/lib/cron/send-christmas-status.test.ts src/app/api/cron/daily/route.ts
git commit -m "feat: Weihnachts-Statusuebersicht per E-Mail (A7, #2)"
```

---

## Nacharbeiten (nicht Teil dieses Plans)

- README "Stand des Projekts" / Issue #2 schließen, sobald dieser PR gemergt ist (Issue #84 kann dann ebenfalls geschlossen werden, da beide Teil-Issues erledigt sind).
- Die in Task 1 wiederhergestellte, nie gemergte Design-Historie ist ein Lehrbuchbeispiel dafür, Branches nach dem PR-Merge nicht mehr weiterzubenutzen - kein Handlungsbedarf, nur zur Kenntnis.
