# Datenbank-Schema

Dokumentiert das Schema aus [`supabase/migrations/20261022200000_initial_schema.sql`](../supabase/migrations/20261022200000_initial_schema.sql) und [`supabase/migrations/20261029210000_people_birthday_interests_sharing.sql`](../supabase/migrations/20261029210000_people_birthday_interests_sharing.sql). Diese Datei ist als Grundlage für die technische Dokumentation (MS 3/MS 4) gedacht: sie erklärt nicht nur *was* angelegt wurde, sondern auch *warum*.

## 1. Überblick

Fünf Tabellen, alle (direkt oder über eine Elterntabelle) pro Nutzer:in über `user_id` an `auth.users` (von Supabase Auth verwaltet) gebunden:

- **people** – Personen, denen Geschenke gemacht werden
- **occasions** – Anlässe (Weihnachten, Geburtstag, frei erstellbar)
- **gifts** – Geschenkideen *und* bereits gegebene Geschenke (ein Datensatz durchläuft beide Zustände)
- **shared_links** – ein per Link geteilter Satz Personen (A10)
- **shared_link_people** – welche Personen ein Link zeigt (n:m)

```mermaid
erDiagram
    auth_users ||--o{ people : "besitzt"
    auth_users ||--o{ occasions : "besitzt"
    auth_users ||--o{ gifts : "besitzt"
    auth_users ||--o{ shared_links : "besitzt"
    people ||--o{ gifts : "erhält"
    occasions ||--o{ gifts : "gehört zu"
    shared_links ||--o{ shared_link_people : "zeigt"
    people ||--o{ shared_link_people : "wird gezeigt in"

    people {
        uuid id PK
        uuid user_id FK
        text name
        smallint birthday_day
        smallint birthday_month
        smallint birthday_year
        text_array interests
        text notes
    }
    occasions {
        uuid id PK
        uuid user_id FK
        text name
    }
    gifts {
        uuid id PK
        uuid user_id FK
        uuid person_id FK
        uuid occasion_id FK
        text title
        text status
        date gift_date
    }
    shared_links {
        uuid id PK
        uuid user_id FK
        uuid token
    }
    shared_link_people {
        uuid shared_link_id FK
        uuid person_id FK
    }
```

## 2. Entitäten im Detail

### `people`

| Spalte | Typ | Beschreibung |
| --- | --- | --- |
| `id` | uuid | Primärschlüssel |
| `user_id` | uuid | Besitzer:in (FK auf `auth.users`) |
| `name` | text | Name der Person |
| `birthday_day` / `birthday_month` | smallint | Tag/Monat des Geburtstags, zusammen Pflicht sobald einer gesetzt wird |
| `birthday_year` | smallint | Geburtsjahr, optional (Datensparsamkeit, A1/QA7) |
| `interests` | text[] | Interessen als freie Tags, Grundlage für Vorschläge (A12) |
| `notes` | text | Freitext, "weitere Infos zur Person" |
| `created_at` / `updated_at` | timestamptz | Zeitstempel |

**Entscheidung Geburtstag:** `date` kann kein "Jahr optional" abbilden (ein SQL-`date` braucht immer ein Jahr). Deshalb drei Spalten statt einer; `birthday_day`/`birthday_month` sind über einen Check-Constraint an eine gemeinsame Pflicht gekoppelt (beide gesetzt oder beide `null`), `birthday_year` bleibt unabhängig nullable.

### `occasions`

| Spalte | Typ | Beschreibung |
| --- | --- | --- |
| `id` | uuid | Primärschlüssel |
| `user_id` | uuid | Besitzer:in |
| `name` | text | z. B. "Weihnachten", "Geburtstag", oder frei benannt |

**Entscheidung:** Anlässe sind pro Nutzer:in global (nicht pro Person), weil "Weihnachten" für alle Personen gleichzeitig gilt. "Weihnachten" und "Geburtstag" werden automatisch bei Registrierung angelegt (siehe Abschnitt 4), zusätzliche Anlässe kann man frei hinzufügen.

### `gifts`

| Spalte | Typ | Beschreibung |
| --- | --- | --- |
| `id` | uuid | Primärschlüssel |
| `user_id` | uuid | Besitzer:in |
| `person_id` | uuid | Für wen (FK `people`) |
| `occasion_id` | uuid | Zu welchem Anlass (FK `occasions`, nullable) |
| `title` | text | Kurzbezeichnung der Idee/des Geschenks |
| `description` | text | Freitext-Notiz |
| `link` | text | Link zur Idee (z. B. Produktseite) |
| `image_url` | text | Verweis auf Bild in Supabase Storage |
| `status` | text | `idea` (= "offen") \| `purchased` (= "besorgt") \| `given` (= "überreicht", Stufe 2/A9) |
| `gift_date` | date | Datum (geplant oder tatsächlich überreicht) |

**Entscheidung:** Eine Tabelle statt getrennter Tabellen für "Ideen" und "Geschenke". Begründung: laut Themenbeschreibung soll eine Idee einfach in ein Geschenk "umwandelbar" sein – mit einer gemeinsamen Tabelle ist das ein reines Update (`status` ändern, `occasion_id`/`gift_date` setzen) statt eines Datensatz-Transfers zwischen zwei Tabellen. Das vereinfacht auch die geforderte "gemeinsame Ansicht: vergangene Geschenke + Ideen je Person" – ein einziges `select ... where person_id = ...` liefert beides, gefiltert über `status`.

**`open_tasks` (Freitext) wurde wieder entfernt:** A4 verlangt für Stufe 3 eine *strukturierte, abhakbare* Aufgabenliste mit Zähler (z. B. "1/2 erledigt"), kein Freitextfeld. Kommt als eigene Tabelle (`gift_tasks` o. ä.) mit Stufe 3.

### `shared_links` / `shared_link_people`

| Tabelle | Spalte | Typ | Beschreibung |
| --- | --- | --- | --- |
| `shared_links` | `id` | uuid | Primärschlüssel |
| `shared_links` | `user_id` | uuid | Besitzer:in |
| `shared_links` | `token` | uuid | Nicht erratbarer öffentlicher Teil der URL (`/teilen/<token>`) |
| `shared_link_people` | `shared_link_id` | uuid | FK auf `shared_links` |
| `shared_link_people` | `person_id` | uuid | FK auf `people` |

**Entscheidung:** Ein Link kann laut Wireframe mehrere Personen zeigen, und man kann mehrere Links gleichzeitig haben (einzeln widerrufbar) – deshalb zwei Tabellen (1 Link : n Personen) statt eines einzelnen `share_token` pro Person. "Widerrufen" = Zeile in `shared_links` löschen (Cascade löscht die Zuordnungen mit).

**Zugriff ohne Login:** Läuft bewusst nicht über RLS (siehe Abschnitt 3), sondern über eine serverseitige Route mit dem Service-Role-Key, die den Token explizit prüft und nur die zugeordneten Personen/Ideen zurückgibt.

## 3. Sicherheitskonzept: Row Level Security (RLS)

Alle fünf Tabellen haben RLS aktiviert, mit Policies der Form `auth.uid() = user_id` (bei `shared_link_people` über einen Join auf `shared_links.user_id`) für select/insert/update/delete. Das bedeutet konkret:

- Die Datenbank selbst erzwingt die Trennung der Nutzer:innen-Daten – nicht nur der Anwendungscode.
- Selbst wenn im Frontend ein Fehler passiert (z. B. eine falsche Filterbedingung vergessen), kann ein:e Nutzer:in nie fremde Daten sehen oder verändern.
- Relevant für die Qualitätsplanung (MS 3, "Maßnahmen zur Berücksichtigung von IT-Sicherheit und Datenschutz") – RLS ist die von Supabase empfohlene Standard-Absicherung für genau dieses Szenario (mehrere Nutzer:innen, gemeinsame Tabellen).

Zugriff über den **Publishable Key** (clientseitig) ist damit sicher, weil RLS greift. Der **Secret Key** (umgeht RLS vollständig) wird ausschließlich serverseitig für die öffentliche Teilen-Route verwendet (siehe `shared_links` oben) – RLS kann "gehört dieser Token zu dieser Zeile" für anonyme, nicht eingeloggte Zugriffe nicht sauber abbilden, ohne den Token clientseitig als Session-Variable zu übergeben. Der Token selbst ist dabei das Zugriffsrecht (nicht erratbar, 122 Bit Zufall), die Route prüft ihn explizit und gibt gezielt nur die zugeordneten Personen/Ideen zurück.

## 4. Automatisierung (Trigger)

Zwei Datenbank-Trigger:

1. `set_updated_at` – setzt `updated_at` automatisch bei jedem Update (auf `people` und `gifts`), damit das nie vergessen wird.
2. `handle_new_user` – legt bei jeder neuen Registrierung (`auth.users`-Insert) automatisch die Anlässe "Weihnachten" und "Geburtstag" für diese:n Nutzer:in an.

## 5. Abdeckung der funktionalen Anforderungen

| Anforderung (aus der Themenbeschreibung) | Umsetzung im Schema |
| --- | --- |
| Personen mit Geburtstag (Jahr optional), Tags, Notiz (A1) | `people.birthday_day/_month/_year`, `people.interests`, `people.notes` |
| Dokumentation vergangener Geschenke je Person (A2, Stufe 2) | `gifts` mit `status = 'given'`, gefiltert nach `person_id` |
| Feste + frei erstellbare Anlässe (A3) | `occasions`, automatisch vorbelegt + frei erweiterbar |
| Geschenkideen mit Anlass + Status (A4, MVP-Teil) | `gifts.occasion_id`, `gifts.status` |
| Abhakbare Aufgaben je Idee (A4, Stufe 3) | *noch nicht im Schema* – eigene Tabelle folgt mit Stufe 3 |
| Gemeinsame Ansicht Geschenke + Ideen je Person (A5) | ein `gifts`-Select nach `person_id`, `status` unterscheidet |
| Schnelles Speichern Text + Link (A8, MVP-Teil) | `gifts.title`, `gifts.link` |
| Bild-Upload (A8, Stufe 3) | `gifts.image_url` vorbereitet, Storage-Bucket fehlt noch |
| Umwandlung Idee → Geschenk (A9, Stufe 2) | Update von `status`, `occasion_id`, `gift_date` |
| Teilen von Geschenkideen per Link, mehrere Personen/Links (A10, MVP) | `shared_links`, `shared_link_people` |
| Automatische Erinnerungen (A6/A7, Stufe 2) | *noch nicht Teil des Schemas* – wird über den geplanten Cron Job (Vercel) + Query auf `people.birthday_*`/`occasions` umgesetzt |
| Automatische Generierung weiterer Ideen (A12, Stufe 3) | *bewusst nicht im MVP-Schema* – spätere Erweiterung, siehe Abschnitt 6 |

## 6. Bewusst nicht umgesetzt (für später)

- **Automatische Ideen-Generierung (A12, Stufe 3):** Keine eigene Tabelle/Logik im MVP. Erste sinnvolle Umsetzung: regelbasierter Vorschlag (z. B. "gleiche Tags wie bei früheren Geschenken dieser Person"), bewusst ohne KI-Anbindung (RB7).
- **Teilen per Link – öffentlicher Lesezugriff (A10):** Schema (`shared_links`, `shared_link_people`) steht, die öffentliche Next.js-Route (`/teilen/<token>`) mit Service-Role-Zugriff folgt mit der UI-Umsetzung.
- **Bild-Uploads (A8, Stufe 3):** `gifts.image_url` ist vorbereitet, der Supabase-Storage-Bucket dafür muss noch angelegt werden.
- **Abhakbare Aufgaben je Idee (A4, Stufe 3):** Eigene Tabelle (z. B. `gift_tasks`) noch zu entwerfen.

## 7. Migrationen anwenden

Da noch keine Supabase-CLI im Projekt eingerichtet ist, läuft es manuell über das Dashboard:

1. Supabase-Dashboard öffnen → eigenes Projekt → **SQL Editor** (linke Sidebar)
2. "New query"
3. Inhalt der Migrationsdatei(en) **in Reihenfolge des Datums im Dateinamen** komplett einfügen (zuerst `20261022200000_...`, dann `20261029210000_...`)
4. **Run** klicken
5. Kontrolle: unter **Table Editor** sollten jetzt `people`, `occasions`, `gifts`, `shared_links`, `shared_link_people` auftauchen

Die Datei ist bewusst im Supabase-CLI-Namensformat (`YYYYMMDDHHMMSS_name.sql`) benannt – falls später die CLI eingerichtet wird, kann sie 1:1 mit `supabase db push` übernommen werden, ohne etwas umbenennen zu müssen.
