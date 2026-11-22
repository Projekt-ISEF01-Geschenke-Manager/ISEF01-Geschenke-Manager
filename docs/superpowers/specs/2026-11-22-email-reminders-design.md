# E-Mail-Erinnerungen (A6/A7, Stufe 2) — Teil 1: Geburtstagserinnerung + Einstellungen

Umsetzt: [#3](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/3)
(Geburtstagserinnerung), legt dabei Infrastruktur an, die
[#2](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/2)
(Weihnachts-Statusübersicht, eigener Folge-PR) mitnutzt. Teil des
Umbrella-Issues [#84](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/84).

## Intent

Anforderung A6: "Es werden automatische Benachrichtigungen über Geburtstage
im nächsten Monat inkl. bereits bekannter Geschenkideen versendet."
Laut Milestone IM-4.2 fest terminiert: einmal monatlich, am 1.

Bisher laufen alle E-Mails (Registrierung, Passwort-Reset) über Supabases
eigene Auth-Mails - `src/lib/resend.ts` (`sendEmail`) existiert, wird aber
noch nirgends benutzt. Dies ist der erste echte Einsatz.

## Goals
- Am 1. jedes Monats erhält jede:r Nutzer:in mit bestätigtem Konto eine
  E-Mail mit den Personen, die im nächsten Kalendermonat Geburtstag haben,
  je Person inkl. deren aktueller (nicht "given") Geschenkideen.
- Zwei neue Einstellungen pro Konto (`user_metadata`, kein neuer Tisch):
  `remind_birthdays` (Default `true`) und `remind_christmas` (Default
  `true`, wird erst mit PR 2 ausgewertet, aber jetzt schon mit angelegt,
  da beide Schalter auf derselben neuen Seite liegen).
- Ein neuer Schalter pro Person (`people.reminders_enabled`, Default
  `true`): Personen, die hier ausgeschaltet sind, erscheinen in keiner der
  beiden Erinnerungs-Mails (gilt für beide Mail-Typen gleich, keine
  getrennte Granularität - vom Nutzer so bestätigt).
- Neue Dashboard-Seite "Einstellungen" (neuer `DashboardNav`/`TABS`-Eintrag)
  mit den zwei Kontoschaltern.
- Leere Mails werden nie verschickt (niemand mit Geburtstag nächsten Monat
  → keine Mail für dieses Konto in diesem Lauf).
- Kein doppelter Mailversand, falls der tägliche Cron am 1. aus
  irgendeinem Grund zweimal läuft (Vercel-Retry, manueller Re-Trigger):
  `user_metadata.last_birthday_reminder_month` (z. B. `"2026-12"`) wird
  nach erfolgreichem Versand gesetzt; stimmt der Wert schon mit dem
  aktuellen Monat überein, wird für dieses Konto in diesem Lauf nichts
  verschickt.
- Test-Accounts (`app_metadata.is_test_account === true`, gleiche Prüfung
  wie `deleteUnconfirmedAccounts`) werden nie angeschrieben.

## Non-Goals (bewusst nicht in diesem PR)
- Weihnachts-Statusübersicht selbst (#2, eigener PR, nutzt aber
  `remind_christmas` + `people.reminders_enabled` mit).
- Manueller "Bewegung reduzieren"-Schalter auf der neuen Einstellungsseite
  → eigenes Issue [#209](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/209),
  eigener späterer PR.
- Granular getrennte Pro-Person-Schalter für Geburtstag vs. Weihnachten.

## Anti-Goals
- Keine Mail an Konten, deren E-Mail nicht bestätigt ist (gleiche Prüfung
  wie `deleteUnconfirmedAccounts`).
- Keine leeren/inhaltslosen Mails ("niemand hat nächsten Monat Geburtstag").

## Constraints
- Täglicher Cron läuft schon (`/api/cron/daily`, 06:00 UTC) - der neue Job
  prüft intern selbst, ob heute der 1. ist, statt eine eigene
  Vercel-Cron-Konfiguration zu brauchen (gleiches Prinzip wie
  `convert-past-gifts`).
- `runDailyJobs` isoliert Fehler pro Job bereits (siehe `daily-jobs.ts`) -
  ein Fehler beim Mailversand für ein Konto darf die anderen Konten nicht
  blockieren (gleiches Muster wie `deleteUnconfirmedAccounts`: Fehler pro
  Konto sammeln, am Ende gebündelt werfen).
- E-Mail-Design: einfaches, inline-gestyltes HTML (E-Mail-Clients können
  kein externes CSS) in deutscher Sprache, passend zum Giftwise-Ton -
  keine aufwendige Vorlagen-Engine nötig für zwei Mail-Typen.

## Approaches (zur Erinnerung, im Gespräch schon entschieden)
1. **Speicherort Kontoeinstellungen:** `user_metadata` (gewählt) vs. neue
   Tabelle mit RLS. `user_metadata` gewählt, weil Präzedenzfall
   (`full_name`) existiert, keine Migration nötig, und
   `listUsers()`/`getUser()` liefert es ohnehin mit.
2. **Granularität Pro-Person-Schalter:** ein Schalter für beide Mail-Typen
   (gewählt, vom Nutzer bestätigt) vs. getrennt je Mail-Typ (verworfen,
   unnötige Komplexität für einen Fall, der laut Nutzer nicht gebraucht
   wird).
3. **Bewegung-reduzieren-Schalter jetzt mitbauen oder separat:** separat
   (gewählt) - eigenes Issue #209, weil inhaltlich ohne Bezug zu
   E-Mail-Erinnerungen, und PRs bleiben pro Issue fokussiert.

## Was entschieden ist (Details)

**Migration:** `people.reminders_enabled boolean not null default true`.

**Person-Formular (`person-card.tsx`, `src/app/actions/people.ts`):**
neue Checkbox "In Erinnerungen einschließen" neben den bestehenden Feldern;
`parsePersonFields`/`toPersonRecord` entsprechend erweitern (Checkbox fehlt
in `FormData`, wenn nicht angehakt → `formData.has("remindersEnabled")`
auswerten, nicht `formString`).

**Neue Einstellungsseite** (`src/app/dashboard/einstellungen/page.tsx` o.
ä., neuer Eintrag in `DashboardNav`/`TABS`): zwei Schalter
(Geburtstagserinnerung, Weihnachts-Status), liest/schreibt
`user_metadata` über eine neue Server Action (`updateUser({ data: {...} })`,
gleiches Muster wie `auth.ts`).

**Neuer Cron-Job** `src/lib/cron/send-birthday-reminders.ts`
(+ `.test.ts`):
- Nur ausführen, wenn `now.getDate() === 1`.
- "Nächster Monat" = `now.getMonth() + 1` (mit Jahresumbruch Dezember →
  Januar).
- Über `supabase.auth.admin.listUsers()` paginieren (wie
  `deleteUnconfirmedAccounts`), E-Mail-bestätigte, nicht-Test-Konten
  (`app_metadata.is_test_account !== true`) mit
  `user_metadata.remind_birthdays !== false` und
  `user_metadata.last_birthday_reminder_month !== aktueller Monat`
  herausfiltern.
- Nach erfolgreichem Versand für ein Konto:
  `user_metadata.last_birthday_reminder_month` auf den aktuellen Monat
  setzen (`updateUser`/Admin-API).
- Pro Konto: `people` laden (`birthday_day`, `birthday_month`,
  `reminders_enabled = true`), die mit `birthday_month` = nächster Monat;
  pro gefundener Person deren offene/besorgte (nicht "given") `gifts`
  laden (`title`, `status`, analog `ACTIVE_GIFT_STATUSES`).
- Keine Treffer → keine Mail für dieses Konto.
- Treffer → eine Mail über `sendEmail()` (Betreff z. B. "Geburtstage im
  Dezember" o. ä., HTML-Liste: Person, Tag, darunter deren Ideen
  Titel + Status-Badge).
- Fehler pro Konto sammeln, am Ende gebündelt werfen (Muster wie
  `deleteUnconfirmedAccounts`).
- In `DAILY_JOBS` (`src/app/api/cron/daily/route.ts`) eintragen.

**Mail-Inhalt (Platzhalter-Text, Feinschliff beim Bauen):**
```
Betreff: Geburtstage im Dezember

Hallo,

im Dezember haben folgende Personen Geburtstag:

Melanie – 26. Dezember
  • Formen Stanzer (offen)
  • Kopfhörer (besorgt)

[...]

Einstellungen ändern: <Link zur Einstellungsseite>
```

## Was dem:der Umsetzer:in überlassen bleibt
- Exakter Mail-Betreff/-Text-Feinschliff (deutsche Monatsnamen etc.).
- Exakte Tailwind-Klassen/Icon für den neuen `DashboardNav`-Tab (Muster aus
  bestehenden Tabs übernehmen).
- Ob die Checkbox im Person-Formular einen eigenen `.form-stagger`-Slot
  bekommt oder neben "Notizen" steht (Design-System-Konventionen aus
  `DESIGN-DARKMODE.md` anwenden).
- Tests: mind. `send-birthday-reminders.test.ts` (Monatsgrenze Dezember→
  Januar, `reminders_enabled=false` wird übersprungen,
  `remind_birthdays=false` wird übersprungen, `is_test_account=true` wird
  übersprungen, bereits gesetztes `last_birthday_reminder_month` für den
  aktuellen Monat wird übersprungen, keine Treffer → kein
  `sendEmail`-Aufruf, "given"-Geschenke tauchen nicht in der Mail auf).
