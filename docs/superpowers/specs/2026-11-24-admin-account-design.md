# Admin-Account (#90, ZA5)

Umsetzt: [#90](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/90)
(Admin-Account), Anforderung ZA5.

## Intent

ZA5: Eine Admin-Rolle mit Benutzerliste (E-Mail, Registrierungsdatum,
bestätigt ja/nein) und Löschfunktion für Konten - ohne Einsicht in
Personen, Ideen oder Geschenke der Nutzer:innen. Normale Konten erreichen
die Admin-Seite nicht.

Giftwise kennt aktuell keine Admin-Rolle. Privilegierter Zugriff existiert
bisher nur serverseitig über den Service-Role-Key (Cron-Jobs, Teilen-Route,
Rate-Limiting), nie als eigene UI für eine Person.

## Goals

- Eine neue, eigenständige Route (nicht unter `/dashboard`, siehe
  Constraints) zeigt eine Liste aller Konten: E-Mail, Registrierungsdatum,
  bestätigt ja/nein.
- Ein Löschen-Button pro Konto, mit Sicherheitsabfrage (gleiches Muster
  wie beim Löschen einer Person, `DeletePersonButton`) - löscht das
  Auth-Konto vollständig; die bestehenden `on delete cascade`-Fremdschlüssel
  (`people`, `occasions`, `gifts`, `shared_links`, `shared_link_people`
  referenzieren `auth.users(id) on delete cascade`) räumen automatisch
  alle zugehörigen Daten mit auf - keine zusätzliche Lösch-Logik nötig.
- Nur Konten mit `app_metadata.is_admin === true` erreichen die Seite;
  alle anderen (eingeloggt oder nicht) werden wie nicht eingeloggte
  Nutzer:innen zur Startseite umgeleitet (kein Hinweis, dass die Route
  überhaupt existiert).
- Test-Accounts (`app_metadata.is_test_account === true`) erscheinen
  nicht in der Liste (praktisch: sonst würde die Liste bei lokalem
  Testen/Entwickeln mit Test-Accounts zugemüllt).

## Non-Goals (bewusst nicht in diesem PR)

- Kein Self-Service, um ein Konto zum Admin zu machen - das Flag wird
  manuell im Supabase-Dashboard gesetzt (gleicher Mechanismus wie
  `is_test_account`, das schon heute nur manuell gesetzt wird). Kein Code
  dafür nötig.
- Keine Bearbeitung anderer Felder (E-Mail ändern, Passwort zurücksetzen
  im Auftrag der Nutzer:in, o. Ä.) - nur Ansehen + Löschen.
- Keine UI-Paginierung der Benutzerliste - ein einzelner
  `listUsers()`-Aufruf mit großzügigem `perPage` (z. B. 200, wie in den
  Cron-Jobs) reicht für die absehbare Nutzerzahl dieses Studienprojekts.
  Bekannte Grenze, keine Lösung in diesem PR.

## Anti-Goals

- Unter keinen Umständen dürfen Personen, Ideen oder Geschenke einer
  fremden Nutzer:in auf der Admin-Seite sichtbar sein oder abgefragt
  werden - auch nicht aggregiert (z. B. "Anzahl Personen").
- Kein öffentlich erreichbarer Hinweis (Navigation, Sitemap, robots.txt),
  dass die Admin-Route existiert.

## Was entschieden ist (Details)

**Route:** `src/app/admin/page.tsx` - bewusst außerhalb von `/dashboard`,
weil `src/app/dashboard/layout.tsx` automatisch `SiteHeader` mit der
vollen `DashboardNav` (die drei Nutzer:innen-Tabs) um jede
`/dashboard/*`-Seite legt; das wäre für eine Admin-Seite falsch (sieht
aus wie eine normale Dashboard-Unterseite, hat aber nichts mit den
Tabs zu tun). Die Admin-Seite bekommt ihr eigenes, minimales Layout.

**Zugriffsschutz:** Eine neue Funktion `requireAdmin()` in
`src/lib/supabase/server.ts` (gleiche Datei, gleiches Muster wie
`requireUser()`): ruft `requireUser()` auf, prüft danach zusätzlich
`user.app_metadata?.is_admin === true`; ist das nicht der Fall,
`redirect("/")` - exakt dieselbe Weiterleitung wie bei einer:m nicht
eingeloggten Nutzer:in, damit ein normales Konto, das die URL errät,
keinen Unterschied zwischen "nicht eingeloggt" und "kein Admin" bemerkt.

**Serverseitige Rechteprüfung auch in den Server Actions selbst**, nicht
nur auf der Seite - Verteidigung in der Tiefe, gleiches Prinzip wie beim
Rate-Limiting (`src/lib/rate-limit.ts`): Die Seite verhindert zwar schon
den Zugriff, aber `listAllAccounts`/`deleteAccount` prüfen `is_admin`
zusätzlich selbst, falls sie je von anderswo aufgerufen werden.

**Benutzerliste laden:** `src/app/actions/admin.ts`,
`listAllAccounts(): Promise<AdminAccountRow[]>` - paginiert über
`supabase.auth.admin.listUsers({ page, perPage: 200 })` (Service-Client,
gleiches Muster wie `deleteUnconfirmedAccounts`/`sendBirthdayReminders`),
filtert `app_metadata.is_test_account === true` heraus, liefert pro
verbleibendem Konto `{ id, email, createdAt, confirmed: !!email_confirmed_at }`.

**Konto löschen:** `deleteAccount(userId: string)` - Server Action nach
demselben `useActionState`-Muster wie `deletePerson`
(`src/app/actions/people.ts`) und `DeletePersonButton`
(`src/components/delete-person-button.tsx`): Button mit `confirm(...)`
im `onSubmit`, bei Bestätigung `supabase.auth.admin.deleteUser(userId)`
(Service-Client). Cascade-Löschung übernimmt die Datenbank selbst.

**Seiteninhalt:** Einfache Tabelle (Design-System: `surface`-Karte,
Design-Tokens statt roher Farben) mit den Spalten E-Mail,
Registrierungsdatum (`new Date(createdAt).toLocaleDateString("de-DE")` -
`formatGiftDate` aus `format.ts` passt nicht, die erwartet ein reines
`YYYY-MM-DD`-Datum ohne Uhrzeit), bestätigt (✓/✗ oder Text, nicht nur
Farbe - Design-System-Regel "nie nur Farbe"), Löschen-Button pro Zeile.

## Was dem:der Umsetzer:in überlassen bleibt

- Exakte Formulierung der `confirm()`-Sicherheitsabfrage.
- Ob die Admin-Seite `SiteHeader` (ohne `nav`-Prop) zur visuellen
  Konsistenz wiederverwendet oder komplett eigenständig bleibt - beides
  ist mit dem Design-System vereinbar, Hauptsache Tokens statt roher
  Farben.
- Sortierung der Liste (z. B. nach Registrierungsdatum).
- Tests: mind. `requireAdmin()`/`listAllAccounts`/`deleteAccount` (Admin
  erreicht die Seite, Nicht-Admin wird umgeleitet, nicht eingeloggt wird
  umgeleitet, Test-Accounts fehlen in der Liste, Löschen ruft
  `deleteUser` mit der richtigen ID auf, Nicht-Admin-Aufruf einer
  Server Action wird abgelehnt).
