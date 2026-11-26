# Changelog

Wird automatisch gepflegt: Nach jedem Merge eines Pull Requests nach `main`
ergänzt der Workflow [`.github/workflows/changelog.yml`](.github/workflows/changelog.yml)
hier automatisch einen Eintrag mit PR-Titel und -Nummer. Kein manueller
Schritt vor dem Merge nötig.

## 2026-11-25
- Feature: Admin-Panel über die Einstellungsseite erreichbar machen (#219)

## 2026-11-24
- Feature: Admin-Account mit Benutzerliste und Loeschfunktion (#217)
- Docs: README auf Weihnachts-Statusübersicht aktualisiert (#216)
- Fix: Eindeutigerer Wortlaut in der Weihnachts-Statusübersicht (#215)
- Feature: Weihnachts-Statusübersicht per E-Mail (#214)
- Docs: README auf aktuellen Projektstand gebracht (#213)

## 2026-11-22
- Feature: Manueller Schalter zum Reduzieren von Bewegung in den Einstellungen (#212)
- Fix: iOS-Statusleiste passt sich jetzt der gewählten Farbpalette an (#211)
- Feature: Monatliche Geburtstagserinnerung per E-Mail und Einstellungsseite (#210)
- Fix: Changelog-Workflow kann nicht nach main pushen (Branch Protection) (#206)
- Fix: Bearbeiten-Formular unsichtbar, Farbmenü und Header auf kleinen Handys (#205)
- Doku: Design-System um Animationen, Skeletons und Navigation ergänzt (#204)
- Fix: Changelog-Workflow lief nie, fehlende Einträge nachgetragen (#203)
- Chore: Mutationstest inkrementell und ohne reine Darstellungsdateien (#202)
- Feature: Design-Überarbeitung: Animationen, Skeleton-Loader, Navigation mit schwebender Tabbar am Handy und neue Seite Geteilte Links (#201)
- Feature: Einheitliches Farbsystem mit wählbaren Paletten, Karten und Buttons (#200)
- Fix: Geschenk-Workflow automatisiert statt manuellem "Als Geschenk übernehmen" (#198)
- Chore: Mutation-Testing läuft jetzt bei jedem PR statt nur wöchentlich (#197)
- Feature: Idee in Geschenk umwandeln + Frühere Geschenke anzeigen (#196)
- Chore: Wöchentliches Mutation-Testing mit Stryker eingerichtet (#195)
- Docs: README ausführlich aktualisiert (#193)
- Feature: Besorgt/offen auf der geteilten Ansicht umschaltbar (#192)

## 2026-11-21
- Feature: Geteilte Ansicht an Wireframe angepasst, Stufe 1 (#190)
- Feature: Personenseite an Wireframe angepasst, Stufe 1 (#189)
- Fix: Erfolgsmeldung nach Passwort-Reset statt stillem Redirect (#188)
- Fix: Passwort-Reset-Link landete auf /dashboard statt bei neuem Passwort (#187)
- Feature: Unbestätigte Konten nach 7 Tagen automatisch löschen (#186)
- Feature: Passwort zurücksetzen umgesetzt (#185)
- Chore: Automatisches Changelog eingerichtet (#184)
- Chore: Repo-Sicherheitseinstellungen geschärft (#181)
- Feature: Täglichen Zeitplaner für Cron-Jobs eingerichtet (#180)
- Feature: Echte Datenschutzerklärung ergänzt (#179)

## 2026-11-18
- Fix: Eingabefelder auf Mobilgeräten mit 16px statt 14px (#177)

## 2026-11-16
- Feature: Header, Nav und Footer zentral im Dashboard-Layout (#175)
- Feature: Layout nutzt auf großen Bildschirmen mehr Breite (#174)
- Fix: Veraltete Erfolgsmeldung nach dem Löschen einer Person (#173)
- Fix: Lösch-Buttons zeigen während des Requests Feedback und sind disabled (#172)
- Fix: Lade-Skeleton für Dashboard und Personenseite ergänzt (#171)
- Feature: Favicon durch Giftwise-Logo ersetzt (#166)
- Feature: Bestehende Geschenkideen lassen sich jetzt bearbeiten (#165)
- Chore: CODEOWNERS ergänzt, damit Reviews gezielt an Jakob gehen (#164)
- Fix: Löschen einer Person führte zu 404 statt Weiterleitung (#163)
- Fix: Formular-Buttons gegen Mehrfachklick absichern (#162)
- Fix: Header-Elemente überlappen sich auf sehr schmalen Viewports (#161)
- Fix: Viewport-Meta-Tag ergänzt gegen dauerhaften Mobile-Zoom (#160)

## 2026-11-02
- Docs: README auf aktuellen Projektstand gebracht (#153)
