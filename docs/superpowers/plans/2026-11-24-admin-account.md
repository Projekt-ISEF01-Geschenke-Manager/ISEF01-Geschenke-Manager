# Admin-Account (#90, ZA5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Admin-Rolle (`app_metadata.is_admin === true`, manuell im Supabase-Dashboard gesetzt) bekommt unter `/admin` eine Liste aller Konten (E-Mail, Registrierungsdatum, bestätigt ja/nein, Test-Accounts ausgeschlossen) mit Löschfunktion pro Konto. Alle anderen Konten (eingeloggt oder nicht) landen beim Aufruf von `/admin` wie nicht eingeloggte Nutzer:innen auf der Startseite.

**Architecture:** `requireAdmin()` (neu in `src/lib/supabase/server.ts`, ruft intern `requireUser()` auf) gated sowohl die Seite als auch jede privilegierte Server Action. Neue Server Actions in `src/app/actions/admin.ts` (`listAllAccounts`, `deleteAccount`) nutzen den Service-Client (`createServiceClient`, `src/lib/supabase/service.ts`) für `auth.admin.listUsers`/`auth.admin.deleteUser` - gleiches Muster wie die bestehenden Cron-Jobs. Die Seite `src/app/admin/page.tsx` liegt bewusst außerhalb von `/dashboard`, um `DashboardLayout`s `SiteHeader`/`DashboardNav` nicht zu erben.

**Tech Stack:** Next.js Server Actions, Supabase Admin API, Vitest + Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-24-admin-account-design.md](../specs/2026-11-24-admin-account-design.md)

## Global Constraints

- `app_metadata.is_admin === true` ist die einzige Zugriffsvoraussetzung - kein Code zum Setzen dieses Flags (manuell im Supabase-Dashboard, wie bei `is_test_account`).
- Nicht-Admins (eingeloggt oder nicht) werden auf `/admin` IMMER zu `/` umgeleitet - kein 403/404, kein Hinweis, dass die Route existiert. Exakt dieselbe Weiterleitung wie bei `requireUser()` für nicht eingeloggte Nutzer:innen.
- `requireAdmin()` wird NICHT nur auf der Seite geprüft, sondern auch innerhalb von `listAllAccounts()` und `deleteAccount()` selbst - Verteidigung in der Tiefe (siehe Spec, Abschnitt "Serverseitige Rechteprüfung").
- `app_metadata.is_test_account === true`-Konten erscheinen nie in der Liste.
- `auth.admin.deleteUser(id)` (nicht `deleteUserById` - das existiert in der installierten `@supabase/auth-js`-Version nicht, siehe `node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.d.ts`). Cascade-Löschung (`people`/`occasions`/`gifts`/`shared_links`/`shared_link_people`) übernimmt die Datenbank über die bestehenden `on delete cascade`-Fremdschlüssel - kein zusätzlicher Lösch-Code.
- Die Admin-Seite darf zu KEINEM Zeitpunkt Personen/Ideen/Geschenke eines Kontos laden oder anzeigen, auch nicht aggregiert.
- Löschen läuft über denselben `confirm()` + `useActionState`-Flow wie `DeletePersonButton` (`src/components/delete-person-button.tsx`), nicht über die `Modal`-Komponente.
- Design-System: Tokens statt roher Farben (`surface`, `btn`/`btn-danger`, `rounded-lg border border-input-border` o. Ä. für die Tabelle), "bestätigt" nie nur über Farbe, sondern Text/Icon dazu (siehe AGENTS.md).

## Review Focus

- `requireAdmin()` muss bei fehlendem `is_admin`-Flag IMMER zu `/` umleiten, nicht zu einer 403-Seite oder mit einem Fehler - sonst verrät die Route ihre Existenz.
- `listAllAccounts()`/`deleteAccount()` müssen die Admin-Prüfung selbst durchführen, nicht nur auf die Seiten-Gate vertrauen.
- Test-Accounts dürfen unter keinen Umständen in `listAllAccounts()`s Rückgabe landen.
- `deleteAccount(userId)` muss exakt die übergebene `userId` an `auth.admin.deleteUser` weiterreichen, keine andere ID (z. B. die der aufrufenden Admin-Person) löschen können.
- Die Seite darf keine fremden Personen/Ideen/Geschenke laden - weder direkt noch über eine versehentliche zusätzliche Query.

---

## Task 1: `requireAdmin()` und Server Actions

**Files:**
- Modify: `src/lib/supabase/server.ts` (neue Funktion `requireAdmin()`)
- Test: `src/lib/supabase/server.test.ts`
- Create: `src/app/actions/admin.ts`
- Test: `src/app/actions/admin.test.ts`

**Interfaces:**
- Produces: `requireAdmin(): Promise<{ supabase, user }>` (wirft/redirect wie `requireUser()`, zusätzlich admin-geprüft), von Task 2 konsumiert.
- Produces: `listAllAccounts(): Promise<AdminAccountRow[]>`, `deleteAccount(userId: string, prevState?: DeleteAccountState): Promise<DeleteAccountState>`, beide von Task 2 konsumiert.
- Consumes: `requireUser()` (bereits vorhanden), `createServiceClient()` (`src/lib/supabase/service.ts`, bereits vorhanden).

- [ ] **Step 1: Fehlschlagenden Test für `requireAdmin()` schreiben**

In `src/lib/supabase/server.test.ts` (bestehende Mocks für `createClient()`/`auth.getUser()` als Vorlage nehmen - Datei vorher lesen):

```ts
it("leitet zu / um, wenn eingeloggt aber kein Admin", async () => {
  // auth.getUser() liefert einen User MIT app_metadata = {} (kein is_admin)
  await expect(requireAdmin()).rejects.toThrow(/NEXT_REDIRECT|redirect/i);
  // oder: redirect-Mock pruefen, je nach bestehendem Testmuster der Datei
});

it("leitet zu / um, wenn gar nicht eingeloggt", async () => {
  // auth.getUser() liefert user: null, wie beim requireUser()-Test
});

it("gibt supabase+user zurueck, wenn app_metadata.is_admin === true", async () => {
  // auth.getUser() liefert User MIT app_metadata = { is_admin: true }
  const result = await requireAdmin();
  expect(result.user.app_metadata?.is_admin).toBe(true);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/lib/supabase/server.test.ts`
Expected: FAIL (`requireAdmin` existiert nicht)

- [ ] **Step 3: `requireAdmin()` implementieren**

In `src/lib/supabase/server.ts`, nach `requireUser()`:

```ts
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  if (user.app_metadata?.is_admin !== true) {
    redirect("/");
  }
  return { supabase, user };
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/lib/supabase/server.test.ts`
Expected: PASS

- [ ] **Step 5: Fehlschlagende Tests für die Server Actions schreiben**

In `src/app/actions/admin.test.ts` (Mock-Aufbau für `createServiceClient` wie in `send-christmas-status.test.ts`: `listUsersMock`, ein neuer `deleteUserMock`; Mock für `@/lib/supabase/server` liefert `requireUser` mit steuerbarem `app_metadata.is_admin`):

```ts
it("listAllAccounts: wirft, wenn kein Admin", async () => {
  // requireUser-Mock liefert user ohne is_admin
  await expect(listAllAccounts()).rejects.toThrow();
  expect(listUsersMock).not.toHaveBeenCalled();
});

it("listAllAccounts: liefert bestaetigte, nicht-Test-Konten, Test-Accounts ausgefiltert", async () => {
  // requireUser-Mock liefert Admin
  // listUsersMock: 1x Seite mit [confirmed-normal-user, test-account-user], 1x leere Seite
  const result = await listAllAccounts();
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ confirmed: true });
});

it("listAllAccounts: confirmed=false bei email_confirmed_at=null", async () => {
  // ein User ohne email_confirmed_at -> confirmed: false in der Rueckgabe
  // (anders als bei den Cron-Jobs wird hier NICHT herausgefiltert, nur angezeigt)
});

it("deleteAccount: wirft/liefert Fehler, wenn kein Admin", async () => {
  // requireUser-Mock liefert user ohne is_admin
  await expect(deleteAccount("user-123")).rejects.toThrow();
  expect(deleteUserMock).not.toHaveBeenCalled();
});

it("deleteAccount: ruft auth.admin.deleteUser mit der uebergebenen ID auf", async () => {
  // requireUser-Mock liefert Admin
  deleteUserMock.mockResolvedValueOnce({ error: null });
  await deleteAccount("user-123");
  expect(deleteUserMock).toHaveBeenCalledWith("user-123");
});

it("deleteAccount: liefert Fehlertext bei Supabase-Fehler", async () => {
  deleteUserMock.mockResolvedValueOnce({ error: { message: "kaputt" } });
  const result = await deleteAccount("user-123");
  expect(result?.error).toContain("kaputt");
});
```

Hinweis für `listAllAccounts`-Rückgabetyp: `confirmed` zeigt den tatsächlichen Bestätigungsstatus an (anders als die Cron-Jobs, die unbestätigte Konten herausfiltern - hier sollen sie SICHTBAR sein, siehe Issue #90: "bestätigt ja/nein" als Spalte).

- [ ] **Step 6: Tests laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/app/actions/admin.test.ts`
Expected: FAIL (Modul existiert nicht)

- [ ] **Step 7: `src/app/actions/admin.ts` implementieren**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const USERS_PER_PAGE = 200;

export type AdminAccountRow = {
  id: string;
  email: string;
  createdAt: string;
  confirmed: boolean;
};

async function assertAdmin(): Promise<void> {
  const { user } = await requireUser();
  if (user.app_metadata?.is_admin !== true) {
    throw new Error("Kein Admin-Konto.");
  }
}

export async function listAllAccounts(): Promise<AdminAccountRow[]> {
  await assertAdmin();

  const supabase = createServiceClient();
  const accounts: AdminAccountRow[] = [];
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
    if (users.length === 0) break;

    for (const user of users) {
      if (user.app_metadata?.is_test_account === true) continue;
      accounts.push({
        id: user.id,
        email: user.email ?? "",
        createdAt: user.created_at,
        confirmed: !!user.email_confirmed_at,
      });
    }

    page += 1;
  }

  return accounts;
}

export type DeleteAccountState = { error?: string } | undefined;

export async function deleteAccount(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState?: DeleteAccountState,
): Promise<DeleteAccountState> {
  await assertAdmin();

  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
}
```

- [ ] **Step 8: Tests laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/app/actions/admin.test.ts`
Expected: PASS

- [ ] **Step 9: Vollen Testlauf + Build prüfen**

Run: `npm test && npm run build`
Expected: alle Tests grün, Build ohne Typfehler.

- [ ] **Step 10: Commit**

```bash
git add src/lib/supabase/server.ts src/lib/supabase/server.test.ts src/app/actions/admin.ts src/app/actions/admin.test.ts
git commit -m "feat: requireAdmin() und Server Actions fuer Admin-Account (#90)"
```

---

## Task 2: `/admin`-Seite mit Benutzerliste und Löschen-Button

**Files:**
- Create: `src/app/admin/page.tsx`
- Test: `src/app/admin/page.test.tsx`
- Create: `src/components/delete-account-button.tsx`
- Test: `src/components/delete-account-button.test.tsx`

**Interfaces:**
- Consumes: `requireAdmin()`, `listAllAccounts`, `deleteAccount`, `AdminAccountRow`, `DeleteAccountState` (alle aus Task 1).

- [ ] **Step 1: Fehlschlagenden Test für `DeleteAccountButton` schreiben**

In `src/components/delete-account-button.test.tsx` (Vorbild: ein bestehender Test für `DeletePersonButton`, falls vorhanden - sonst Aufbau wie `person-form.test.tsx`: `confirm` global mocken via `vi.spyOn(window, "confirm")`):

```ts
it("ruft die Action nicht auf, wenn die Sicherheitsabfrage abgebrochen wird", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  // render(<DeleteAccountButton accountId="u1" email="a@b.de" />)
  // Klick auf "Löschen" -> deleteAccount wird NICHT aufgerufen
});

it("ruft die Action mit der accountId auf, wenn bestaetigt", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  // Klick auf "Löschen" -> deleteAccount(accountId, ...) wird aufgerufen
});

it("zeigt eine Fehlermeldung, wenn die Action einen Fehler liefert", async () => {
  // deleteAccount-Mock liefert { error: "..." } -> Text sichtbar
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/components/delete-account-button.test.tsx`
Expected: FAIL

- [ ] **Step 3: `DeleteAccountButton` implementieren**

Exaktes Vorbild `src/components/delete-person-button.tsx` - `useActionState(deleteAccount.bind(null, accountId), undefined)`, `confirm()` im `onSubmit` mit einer Formulierung, die die E-Mail-Adresse nennt (z. B. `` `Konto ${email} wirklich unwiderruflich löschen? Damit werden auch alle Personen, Ideen und Geschenke dieses Kontos gelöscht.` ``), Button-Klasse `btn btn-danger btn-sm` (oder `text-danger underline` wie beim Vorbild - Design-System-Tokens, exakte Wahl dem:der Umsetzer:in überlassen), `disabled` während `isPending`.

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/components/delete-account-button.test.tsx`
Expected: PASS

- [ ] **Step 5: Fehlschlagenden Test für die Admin-Seite schreiben**

In `src/app/admin/page.test.tsx` (Mock-Aufbau wie `dashboard/layout.test.tsx`: `@/lib/supabase/server` mocken, hier `requireAdmin` statt `requireUser`; zusätzlich `@/app/actions/admin` mocken für `listAllAccounts`):

```ts
it("zeigt E-Mail, Registrierungsdatum und Bestaetigt-Status jedes Kontos", async () => {
  // listAllAccountsMock liefert [{ id: "u1", email: "a@b.de", createdAt: "2026-01-15T10:00:00Z", confirmed: true }, ...]
  // render -> screen.getByText("a@b.de"), Registrierungsdatum sichtbar (z.B. "15.1.2026" oder "15.01.2026"), "Bestätigt" sichtbar
});

it("zeigt einen eindeutigen Hinweistext bei unbestaetigtem Konto (nicht nur Farbe)", async () => {
  // confirmed: false -> Text wie "Nicht bestätigt" sichtbar, nicht nur ein farbiges Symbol
});

it("rendert fuer jedes Konto einen Loeschen-Button", async () => {
  // zwei Konten -> zwei DeleteAccountButton-Instanzen (z.B. ueber getAllByText("Löschen") pruefen)
});

it("zeigt eine Meldung, wenn kein Konto in der Liste ist", async () => {
  // listAllAccountsMock liefert []
});
```

Falls `requireAdmin()` bereits per `redirect()` serverseitig greift (Next.js wirft dabei intern `NEXT_REDIRECT`), braucht die Seite selbst keinen zusätzlichen Test für den Umleitungsfall - das ist bereits in Task 1 (`requireAdmin()`-Unit-Test) abgedeckt. Diese Tests hier prüfen nur das Rendering bei erfolgreichem Zugriff.

- [ ] **Step 6: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- src/app/admin/page.test.tsx`
Expected: FAIL (Seite existiert nicht)

- [ ] **Step 7: `src/app/admin/page.tsx` implementieren**

Server Component, `await requireAdmin()` am Anfang, `const accounts = await listAllAccounts()`, rendert eine `surface`-Karte mit Tabelle (Spalten: E-Mail, Registrierungsdatum, Bestätigt, Aktion). Registrierungsdatum: `new Date(account.createdAt).toLocaleDateString("de-DE")` (siehe Spec - `formatGiftDate` passt nicht, da sie ein reines `YYYY-MM-DD`-Datum ohne Uhrzeit erwartet, `createdAt` aber ein voller ISO-Zeitstempel ist). Bestätigt-Spalte als Text ("Bestätigt"/"Nicht bestätigt"), nicht nur Farbe. Pro Zeile ein `<DeleteAccountButton accountId={account.id} email={account.email} />`. Leere Liste → Hinweistext statt leerer Tabelle. Seite nutzt KEIN `DashboardLayout`/`SiteHeader` mit `DashboardNav` - eigenes, minimales Gerüst (optional `SiteHeader` ohne `nav`-Prop, dem:der Umsetzer:in überlassen, siehe Spec).

- [ ] **Step 8: Test laufen lassen, Erfolg bestätigen**

Run: `npm test -- src/app/admin/page.test.tsx`
Expected: PASS

- [ ] **Step 9: Manuell im Dev-Server prüfen**

`npm run dev`, eigenes Konto per SQL/Dashboard testweise `app_metadata.is_admin = true` setzen (oder Test-Konto verwenden), `/admin` aufrufen → Liste sichtbar; `app_metadata.is_admin` wieder entfernen → `/admin` leitet zu `/` um.

- [ ] **Step 10: Vollen Testlauf + Build prüfen**

Run: `npm test && npm run build`
Expected: alle Tests grün, Build ohne Typfehler.

- [ ] **Step 11: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/page.test.tsx src/components/delete-account-button.tsx src/components/delete-account-button.test.tsx
git commit -m "feat: Admin-Seite mit Benutzerliste und Loeschfunktion (#90, ZA5)"
```

---

## Nacharbeiten (nicht Teil dieses Plans)

- README "Stand des Projekts": Admin-Account von "Geplant" nach "Fertig" verschieben, Issue #90 schließen, sobald dieser PR gemergt ist.
- Manuelles Setzen von `app_metadata.is_admin = true` für das eigene Konto im Supabase-Dashboard, damit die Seite tatsächlich genutzt werden kann (kein Teil dieses PRs - reine Konfiguration).
