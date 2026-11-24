# E-Mail-Erinnerungen (A7, Stufe 2) — Teil 2: Weihnachts-Statusübersicht

Umsetzt: [#2](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/2)
(Weihnachts-Statusübersicht), schließt das Umbrella-Issue
[#84](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/84)
ab. Teil 1 (Geburtstagserinnerung, #3) ist bereits gemergt und legte die
Infrastruktur an, die dieser Teil mitnutzt: `people.reminders_enabled`,
`user_metadata.remind_christmas`, die Einstellungsseite, den
`sendEmail`-Wrapper und das Cron-Harness-Muster.

## Intent

Anforderung A7: "Es werden in der Zeit vor Weihnachten regelmäßig
Benachrichtigungen versendet, die den aktuellen Status für die geplanten
zu beschenkenden Personen darstellen."

Laut Anforderungsliste/SMART-Zieltabelle (MS3) fest terminiert: am 1.
November, 1. Dezember und 15. Dezember, jeweils um 8:00 Uhr.

## Goals

- An den drei festen Terminen (1.11., 1.12., 15.12.) erhält jede:r
  Nutzer:in mit bestätigtem Konto und `remind_christmas !== false` eine
  E-Mail mit dem aktuellen Status aller Personen, für die mindestens ein
  Geschenk dem Anlass "Weihnachten" zugeordnet ist.
- Status je Person spiegelt exakt die Definition, die das Dashboard
  bereits verwendet (`src/app/dashboard/page.tsx`,
  `weihnachtenPurchasedByPerson`): eine Person gilt als **besorgt**,
  sobald mindestens eines ihrer Weihnachten-Geschenke den Status
  `purchased` hat — sonst als **noch offen**. Diese binäre Definition
  wird bewusst 1:1 übernommen, nicht neu erfunden, damit E-Mail und
  Dashboard nie unterschiedliche Aussagen treffen.
- Die Mail beginnt mit derselben Kennzahl, die das Dashboard zeigt: "X
  von Y Personen bereits besorgt".
- Personen mit `reminders_enabled = false` erscheinen nie (gleiche Regel
  wie bei der Geburtstagserinnerung, bereits so vom Team bestätigt: ein
  Schalter gilt für beide Mail-Typen).
- Test-Accounts und unbestätigte Konten werden nie angeschrieben (gleiche
  Prüfung wie bei `deleteUnconfirmedAccounts`/`sendBirthdayReminders`).
- Kein doppelter Versand, falls der tägliche Cron an einem der drei Tage
  aus irgendeinem Grund zweimal läuft.
- Leere Mails werden nie verschickt (niemand hat ein Weihnachten-Geschenk
  geplant → keine Mail für dieses Konto an diesem Termin).

## Non-Goals (bewusst nicht in diesem PR)

- Keine neue, feinere Statuslogik (z. B. "alle Geschenke besorgt" statt
  "mindestens eines") — das wäre eine Änderung der bestehenden
  Dashboard-Semantik und gehört, falls gewünscht, in ein eigenes Issue.
- Keine Auflistung einzelner Geschenktitel in der Mail (anders als bei
  der Geburtstagserinnerung) — A7 verlangt eine **Statusübersicht**, kein
  Ideen-Detail; das hält die Mail kurz und verhindert eine zweite,
  abweichende Darstellungsform für dieselben Daten.
- Keine Änderung an der Einstellungsseite — der Schalter
  "Weihnachts-Statusübersicht per E-Mail" existiert bereits
  (`remind_christmas`) und wird nur erstmals ausgewertet.

## Anti-Goals

- Keine Mail an Konten, deren E-Mail nicht bestätigt ist.
- Keine leeren/inhaltslosen Mails ("niemand hat Weihnachten-Geschenke
  geplant").

## Bekannte Einschränkung

Der "Weihnachten"-Anlass wird pro Konto per Namensvergleich
(`occasions.name === "Weihnachten"`) gefunden — derselbe Mechanismus wie
im Dashboard. Benennt eine Person ihren Standard-Anlass um oder löscht
ihn, läuft die Zuordnung für dieses Konto leer (keine Mail, da keine
Personen gefunden werden) oder funktioniert falsch, je nachdem, ob sie
einen neuen Anlass "Weihnachten" anlegt. Das ist eine bestehende
Einschränkung des Datenmodells (kein `type`/`is_default`-Feld auf
`occasions`), keine neue — wird hier nicht behoben.

## Constraints

- Täglicher Cron läuft schon (`/api/cron/daily`, 06:00 UTC) - der neue
  Job prüft intern selbst, ob heute einer der drei Termine ist, statt
  eine eigene Vercel-Cron-Konfiguration zu brauchen (gleiches Prinzip wie
  `send-birthday-reminders.ts`). Die Abweichung zwischen der im
  Anforderungstext genannten "8:00 Uhr" und dem tatsächlichen Cron-Lauf
  um 06:00 UTC wurde bereits bei Teil 1 (Geburtstagserinnerung) akzeptiert
  und wird hier identisch gehandhabt.
- `runDailyJobs` isoliert Fehler pro Job bereits - ein Fehler beim
  Mailversand für ein Konto darf die anderen Konten nicht blockieren
  (gleiches Muster wie `sendBirthdayReminders`).
- E-Mail-Design: dieselbe inline-gestylte HTML-Vorlage (Kopf mit
  Giftwise-Logo, "klassisch"-Palette, Pill-Button zu den Einstellungen)
  wie die Geburtstagserinnerung - **wird als gemeinsames Modul
  extrahiert** (`src/lib/email-layout.ts`), damit beide Mail-Typen
  optisch garantiert identisch bleiben und nicht zweimal gepflegt werden
  müssen.

## Was entschieden ist (Details)

**Trigger:** `now.getDate() === 24 (CHRISTMAS_DAY aus src/lib/upcoming.ts)`? Nein -
die drei Versandtermine sind 1.11., 1.12., 15.12. (NICHT der 24.12.
selbst, das ist nur das Datum für die "Tage bis Weihnachten"-Anzeige im
Dashboard und hat mit den E-Mail-Terminen nichts zu tun). Geprüft wird:
`(now.getMonth() === 10 && now.getDate() === 1) || (now.getMonth() === 11 && now.getDate() === 1) || (now.getMonth() === 11 && now.getDate() === 15)`
(`getMonth()` 0-basiert: 10 = November, 11 = Dezember).

**Dedup:** `user_metadata.last_christmas_status_date` im Format
`YYYY-MM-DD` (exaktes Kalenderdatum des Laufs, nicht nur der Monat - es
gibt drei Termine pro Saison, die alle einzeln dedupliziert werden
müssen). Stimmt der Wert schon mit dem heutigen Datum überein, wird für
dieses Konto nichts verschickt.

**Personen-/Statusermittlung pro Konto** (Service-Client, RLS umgangen,
`user_id`-Filterung explizit im Code wie bei `sendBirthdayReminders`):

```ts
const { data: occasion } = await supabase
  .from("occasions")
  .select("id")
  .eq("user_id", user.id)
  .eq("name", "Weihnachten")
  .maybeSingle();
if (!occasion) return; // kein Weihnachten-Anlass (umbenannt/gelöscht) -> keine Mail

const { data: gifts } = await supabase
  .from("gifts")
  .select("person_id, status, people!inner(id, name, reminders_enabled)")
  .eq("occasion_id", occasion.id)
  .eq("people.reminders_enabled", true);
```

Pro `person_id` (nur Personen, die nach dem `reminders_enabled`-Filter
übrig bleiben): `purchased = gifts.some(g => g.person_id === p && g.status === "purchased")`
— exakt dieselbe Semantik wie `weihnachtenPurchasedByPerson` im
Dashboard.

**Mail-Inhalt (Platzhalter-Text, Feinschliff beim Bauen):**
```
Betreff: Weihnachts-Statusübersicht

Hallo,

3 von 5 Personen sind schon besorgt:

Oma Erna – besorgt
Papa – noch offen
Lena – besorgt
Jonas – noch offen
Mama – besorgt

Einstellungen ändern: <Link zur Einstellungsseite>
```

**Gemeinsames Layout-Modul:** `src/lib/email-layout.ts` exportiert eine
Funktion, die Kopf (Logo, "GIFTWISE", Tagline), Fuß (Hinweiszeile) und den
Einstellungen-Button als HTML liefert, mit dem eigentlichen Mail-Inhalt
als Parameter in der Mitte. `send-birthday-reminders.ts` wird auf dieses
Modul umgestellt (reiner Refactor, keine Verhaltensänderung - bestehende
Tests müssen unverändert grün bleiben), `send-christmas-status.ts` nutzt
es von Anfang an.

## Was dem:der Umsetzer:in überlassen bleibt

- Exakter Mail-Betreff/-Text-Feinschliff.
- Ob "besorgt"/"noch offen" als Fließtext oder mit denselben
  Status-Badges wie bei der Geburtstagserinnerung dargestellt wird -
  Design-System-Konventionen aus `DESIGN-DARKMODE.md` anwenden, visuell
  konsistent zur bestehenden Geburtstagsmail.
- Exakter Zuschnitt der Refactoring-Grenze zwischen
  `send-birthday-reminders.ts` und `email-layout.ts` (Hauptsache:
  bestehende Tests bleiben unverändert grün, keine Verhaltensänderung an
  der bereits ausgelieferten Geburtstagsmail).
- Tests: mind. `send-christmas-status.test.ts` (alle drei Termine lösen
  aus, andere Tage nicht; `reminders_enabled=false` wird übersprungen;
  `remind_christmas=false` wird übersprungen; `is_test_account=true` wird
  übersprungen; unbestätigte Konten werden übersprungen; Person ohne
  Weihnachten-Geschenk taucht nicht auf; Person mit nur
  "idea"/"given"-Geschenken, aber keinem "purchased", zeigt "noch offen";
  Person mit mindestens einem "purchased"-Geschenk zeigt "besorgt"; Konto
  ohne jeden Weihnachten-Anlass bekommt keine Mail; doppelter Lauf am
  selben Termin verschickt nicht erneut).
