# Bild-Upload für Idee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beim Bearbeiten einer Idee (`GiftItem`) ein eigenes Bild hochladen können; das gespeicherte Bild wird dort und auf der öffentlichen Teilen-Seite angezeigt (Issue #95, Teil 2 von A8).

**Architecture:** Der Upload läuft über die bestehende Server-Action `updateGift` (FormData inkl. `File`), nicht über einen separaten Client-Upload-Pfad – das bleibt konsistent mit jeder anderen Mutation in der App. Der Server lädt die Datei über den eingeloggten (RLS-gebundenen) Supabase-Server-Client in einen neuen, öffentlich lesbaren Storage-Bucket `gift-images` hoch, unter dem festen Pfad `{user_id}/{gift_id}` (keine Dateiendung – der Content-Type kommt explizit beim Upload mit, nicht aus dem Pfad). Ein erneuter Upload überschreibt (`upsert: true`) denselben Pfad, es gibt also pro Idee nie mehr als eine gespeicherte Datei – das vereinfacht "altes Bild beim Ersetzen löschen" zu "einfach überschreiben". Beim Löschen einer Idee wird die Datei unter genau diesem Pfad best-effort mitgelöscht.

**Tech Stack:** Next.js Server Actions, `@supabase/supabase-js` Storage-API (`.storage.from(bucket).upload/remove/getPublicUrl`), Supabase Storage RLS-Policies auf `storage.objects`, Vitest/Testing Library.

**Spec:** Diese Konversation (Brainstorming-Gespräch); kein separates Spec-Dokument, da der Umfang vollständig in der Diskussion festgelegt und vom Nutzer bestätigt wurde ("Ja, passt so, leg los"). Die Link-Vorschau vom hinterlegten Produktlink ist bewusst **nicht** Teil dieses Plans – eigenes, separates Issue/PR (auf Nutzer-Wunsch).

## Global Constraints

- Bild-Upload **nur im Bearbeiten-Modus von `GiftItem`**, nicht in `GiftForm` oder `QuickAddGiftForm` (bestehende Entscheidung, siehe `quick-add-gift-form.tsx:9-13`).
- Erlaubte Dateitypen: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Maximale Größe: 4 MB (`MAX_GIFT_IMAGE_BYTES`). Beides doppelt geprüft: serverseitig in `updateGift` UND als zweite Hürde über die Bucket-Einstellungen `file_size_limit`/`allowed_mime_types` (defense in depth, wie bei `isValidHttpUrl`).
- Storage-Bucket `gift-images`: öffentlich lesbar (`public = true`), Schreiben/Ändern/Löschen nur per RLS für die eigene `user_id` (Pfad-Präfix).
- Anzeige per normalem `<img>`, kein `next/image` (keine bestehende Nutzung in der App, Vorschaubild ist winzig – siehe Brainstorming-Nachricht).
- Kein eigener Download/Kopie von Bildern fremder Links – das ist explizit das separate, nicht in diesem Plan enthaltene Vorhaben.
- `next.config.ts`: `experimental.serverActions.bodySizeLimit` muss über das 1-MB-Default angehoben werden (Next-Doku: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`), sonst schlägt jeder Upload >1 MB serverseitig fehl, bevor `updateGift` überhaupt läuft.
- Migration wird **nicht automatisch** gegen das Live-Projekt angewendet – siehe Task 1, letzter Schritt.

## Review Focus

- Falscher Dateityp hochgeladen (z. B. PDF, Textdatei) → muss mit klarer Fehlermeldung abgelehnt werden, ohne dass irgendetwas hochgeladen oder gespeichert wird. (Task 2)
- Datei größer als 4 MB → muss abgelehnt werden, bevor der Upload überhaupt versucht wird. (Task 2)
- Formular wird gespeichert, ohne ein neues Bild auszuwählen (leeres `<input type="file">`, liefert ein `File` mit Größe 0, nicht `null`) → `image_url` darf dabei nicht verändert/gelöscht werden. (Task 2)
- Bild wird hochgeladen, während die Session abgelaufen ist (`getUser()` liefert keinen Nutzer) → klare Fehlermeldung statt eines Absturzes oder eines Uploads unter einem falschen Pfad. (Task 2)
- Idee mit Bild wird gelöscht, das Entfernen aus dem Storage schlägt fehl (z. B. Netzwerkfehler) → das Löschen der Idee selbst darf dadurch nicht blockiert werden. (Task 3)

---

## Task 1: Storage-Bucket + RLS-Migration

**Files:**
- Create: `supabase/migrations/20261127090000_gift_images_bucket.sql`
- Modify: `docs/database-schema.md` (Zeilen 109, 176, 187 – "Storage-Bucket fehlt noch" durch den tatsächlichen Stand ersetzen; neuer Kurzabschnitt analog zu bestehenden RLS-Erklärungen in Abschnitt 3)

**Interfaces:**
- Produces: Bucket-Id `gift-images` (Konstante `GIFT_IMAGE_BUCKET` in Task 2), Pfadschema `{user_id}/{gift_id}` ohne Dateiendung.

Kein automatisierter Test möglich (reine SQL-Migration, kein lokaler Supabase-Test-Harness im Projekt). Verifikation erfolgt manuell/über die Supabase-MCP-Werkzeuge beim Anwenden (letzter Schritt).

- [ ] **Step 1: Migration schreiben**

```sql
-- ============================================================================
-- Geschenke-Manager: Storage-Bucket für Idee-Bilder (A8, Stufe 3, #95)
-- ============================================================================
-- Ausführliche Erklärung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gift-images',
  'gift-images',
  true,
  4194304, -- 4 MB - zweite Huerde neben der Pruefung in updateGift() (defense in depth)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Pfadschema: "{user_id}/{gift_id}" (kein Dateiname/Endung - der Content-Type
-- kommt beim Upload explizit mit, siehe updateGift()). storage.foldername(name)
-- liefert die Pfad-Segmente vor dem Dateinamen, [1] ist damit die user_id.
create policy "gift_images_select_all" on storage.objects
  for select using (bucket_id = 'gift-images');

create policy "gift_images_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'gift-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "gift_images_update_own" on storage.objects
  for update using (
    bucket_id = 'gift-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "gift_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'gift-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

- [ ] **Step 2: `docs/database-schema.md` aktualisieren**

  - Zeile 109 (`image_url`-Zeile der `gifts`-Tabelle): Beschreibung bleibt, ergänzt um einen Verweis auf den jetzt existierenden Bucket.
  - Zeile 176 (Tabelle Abschnitt 5, Zeile "Bild-Upload (A8, Stufe 3)"): `"gifts.image_url vorbereitet, Storage-Bucket fehlt noch"` → `"gifts.image_url + Storage-Bucket gift-images (öffentlich lesbar, RLS auf eigene user_id)"`.
  - Zeile 187 (Abschnitt 6, "Bewusst nicht umgesetzt"): die ganze Zeile zu Bild-Uploads entfernen (ist jetzt umgesetzt, gehört nicht mehr in "noch nicht umgesetzt").
  - Neuer kurzer Absatz in Abschnitt 3 (direkt nach dem bestehenden RLS-Absatz zu den fünf Tabellen), der den Bucket + die vier Policies in gleicher Kürze wie die Tabellen-Policies erklärt (öffentlich lesbar, Schreiben/Ändern/Löschen nur eigener Pfad-Präfix).

- [ ] **Step 3: Migration anwenden**

  Nicht automatisch ausführen. Den Nutzer fragen, ob die Migration jetzt über die Supabase-MCP-Werkzeuge gegen das Live-Projekt angewendet werden soll, oder ob er sie wie gewohnt selbst über das Dashboard (`docs/database-schema.md` Abschnitt 7) einspielt. Erst nach dessen Entscheidung fortfahren.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261127090000_gift_images_bucket.sql docs/database-schema.md
git commit -m "feat: Storage-Bucket für Idee-Bilder anlegen (#95)"
```

---

## Task 2: Bild-Upload in `updateGift`

**Files:**
- Create: `src/lib/gift-image.ts`
- Modify: `src/app/actions/gifts.ts:86-125` (`updateGift`)
- Modify: `next.config.ts`
- Test: `src/app/actions/gifts.test.ts`

**Interfaces:**
- Consumes: `supabase.storage.from(bucket).upload(path, file, opts)`, `.getPublicUrl(path)`, `.auth.getUser()` (bereits im bestehenden Mock-Client aus `@/lib/supabase/server` enthalten für `auth.getUser`, `storage` muss im Test-Mock ergänzt werden).
- Produces (für Task 3 relevant):
  - `src/lib/gift-image.ts` exportiert `GIFT_IMAGE_BUCKET: string`, `MAX_GIFT_IMAGE_BYTES: number`, `ALLOWED_GIFT_IMAGE_TYPES: readonly string[]`, `giftImagePath(userId: string, giftId: string): string`.
  - `updateGift(giftId, prevState, formData)`: unverändertes Verhalten für `title`/`link`/`occasionId`; akzeptiert zusätzlich ein optionales `formData.get("image")` (File). Bei gültigem, nicht-leerem Bild wird `image_url` (volle öffentliche URL) im Update-Payload ergänzt; sonst bleibt der Payload exakt wie bisher (`{title, link, occasion_id}`, kein `image_url`-Key).

- [ ] **Step 1: `src/lib/gift-image.ts` schreiben**

```ts
// Geteilt zwischen updateGift() (Validierung + Upload) und deleteGift()
// (Aufraeumen) - Bucket-Policies siehe docs/database-schema.md Abschnitt 3.
export const GIFT_IMAGE_BUCKET = "gift-images";

// Zweite Huerde (defense in depth, wie isValidHttpUrl()) - der Bucket selbst
// hat dieselben Grenzen als file_size_limit/allowed_mime_types hinterlegt.
export const MAX_GIFT_IMAGE_BYTES = 4 * 1024 * 1024;

export const ALLOWED_GIFT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// Fester Pfad pro Idee, ohne Dateiendung (Content-Type kommt beim Upload
// explizit mit) - ein erneuter Upload ueberschreibt (upsert) denselben Pfad,
// es gibt also nie mehr als eine gespeicherte Datei pro Idee.
export function giftImagePath(userId: string, giftId: string): string {
  return `${userId}/${giftId}`;
}
```

- [ ] **Step 2: Fehlschlagende Tests schreiben** in `src/app/actions/gifts.test.ts`

  Zuerst die bestehenden Mocks erweitern (oberer Teil der Datei, vor den `describe`-Blöcken):

```ts
const uploadStorageMock = vi.fn();
const removeStorageMock = vi.fn();
const getPublicUrlMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => ({
      insert: (values: unknown) => insertMock(table, values),
      update: (values: unknown) => ({
        eq: (column: string, value: unknown) =>
          eqMockForUpdate(table, values, column, value),
      }),
      delete: () => ({
        eq: (column: string, value: unknown) =>
          eqMockForDelete(table, column, value),
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, file: unknown, opts: unknown) =>
          uploadStorageMock(bucket, path, file, opts),
        remove: (paths: string[]) => removeStorageMock(bucket, paths),
        getPublicUrl: (path: string) => getPublicUrlMock(bucket, path),
      }),
    },
  }),
}));
```

  Dann im `describe("updateGift", ...)`-Block den `beforeEach` erweitern und die neuen Tests ergänzen:

```ts
function makeImageFile(bytes: number, type = "image/png", name = "bild.png") {
  return new File([new Uint8Array(bytes)], name, { type });
}

function formDataWithImage(fields: Record<string, string>, image: File) {
  const fd = formData(fields);
  fd.set("image", image);
  return fd;
}

describe("updateGift", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    updateMock.mockReset();
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } } });
    uploadStorageMock.mockReset().mockResolvedValue({ data: {}, error: null });
    getPublicUrlMock.mockReset().mockReturnValue({
      data: {
        publicUrl: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
      },
    });
  });

  // ... bestehende Tests bleiben unverändert ...

  it("lehnt einen falschen Dateityp ab, ohne hochzuladen", async () => {
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(10, "text/plain", "datei.txt")),
    );
    expect(result?.error).toBe(
      "Bitte lade ein Bild im Format JPEG, PNG, WebP oder GIF hoch.",
    );
    expect(uploadStorageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("lehnt ein zu großes Bild ab (> 4 MB), ohne hochzuladen", async () => {
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(4 * 1024 * 1024 + 1)),
    );
    expect(result?.error).toBe("Das Bild darf höchstens 4 MB groß sein.");
    expect(uploadStorageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("laedt ein gültiges Bild hoch und speichert die öffentliche URL", async () => {
    updateMock.mockResolvedValue({ error: null });
    const image = makeImageFile(1024, "image/jpeg");
    const result = await updateGift("gift-1", undefined, formDataWithImage(validFields, image));

    expect(result).toEqual({ success: true });
    expect(uploadStorageMock).toHaveBeenCalledWith(
      "gift-images",
      "user-1/gift-1",
      image,
      { contentType: "image/jpeg", upsert: true },
    );
    expect(updateMock).toHaveBeenCalledWith(
      "gifts",
      expect.objectContaining({
        image_url: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
      }),
      "id",
      "gift-1",
    );
  });

  it("lässt image_url unverändert, wenn kein neues Bild ausgewählt wurde (leeres File-Input)", async () => {
    updateMock.mockResolvedValue({ error: null });
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(0)),
    );

    expect(result).toEqual({ success: true });
    expect(uploadStorageMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      "gifts",
      { title: "Kräutergarten-Set", link: "https://shop-beispiel.de/kraeutergarten", occasion_id: "occasion-1" },
      "id",
      "gift-1",
    );
  });

  it("gibt einen Fehler zurück, wenn der Upload fehlschlägt", async () => {
    uploadStorageMock.mockResolvedValue({ data: null, error: { message: "upload failed" } });
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(1024, "image/jpeg")),
    );
    expect(result?.error).toBe("upload failed");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("gibt einen Fehler zurück, wenn niemand eingeloggt ist und ein Bild hochgeladen werden soll", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(1024, "image/jpeg")),
    );
    expect(result?.error).toBe("Bitte melde dich erneut an.");
    expect(uploadStorageMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Tests laufen lassen, Fehlschlag bestätigen**

  Run: `npm test -- src/app/actions/gifts.test.ts`
  Expected: FAIL (neue Tests schlagen fehl, `image` wird noch nicht aus `formData` gelesen; ggf. auch TypeScript-Fehler wegen `storage` im Mock, falls `updateGift` noch keinen `supabase.storage`-Zugriff erwartet - das ist ok, die Tests sollen hier noch fehlschlagen).

- [ ] **Step 4: `updateGift` in `src/app/actions/gifts.ts` implementieren**

  Import ergänzen: `import { GIFT_IMAGE_BUCKET, MAX_GIFT_IMAGE_BYTES, ALLOWED_GIFT_IMAGE_TYPES, giftImagePath } from "@/lib/gift-image";`

  `updateGift` ersetzen durch:

```ts
export async function updateGift(
  giftId: string,
  _prevState: GiftFormState,
  formData: FormData,
): Promise<GiftFormState> {
  const title = formString(formData.get("title"));
  const link = formString(formData.get("link"));
  const occasionId = formString(formData.get("occasionId"));
  const image = formData.get("image");

  const values = { personId: "", title, link, occasionId };

  if (!title) {
    return { error: "Bitte gib einen Titel für die Idee ein.", values };
  }
  if (link && !isValidHttpUrl(link)) {
    return {
      error: "Bitte gib einen gültigen Link an (beginnend mit http:// oder https://).",
      values,
    };
  }

  const supabase = await createClient();
  const update: Record<string, unknown> = {
    title,
    link: link || null,
    occasion_id: occasionId || null,
  };

  // Leeres <input type="file"> liefert ein File mit Groesse 0, nicht null -
  // nur dann tatsaechlich hochladen, sonst bleibt image_url unveraendert.
  if (image instanceof File && image.size > 0) {
    if (!ALLOWED_GIFT_IMAGE_TYPES.includes(image.type as (typeof ALLOWED_GIFT_IMAGE_TYPES)[number])) {
      return {
        error: "Bitte lade ein Bild im Format JPEG, PNG, WebP oder GIF hoch.",
        values,
      };
    }
    if (image.size > MAX_GIFT_IMAGE_BYTES) {
      return { error: "Das Bild darf höchstens 4 MB groß sein.", values };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Bitte melde dich erneut an.", values };
    }

    const path = giftImagePath(user.id, giftId);
    const { error: uploadError } = await supabase.storage
      .from(GIFT_IMAGE_BUCKET)
      .upload(path, image, { contentType: image.type, upsert: true });
    if (uploadError) {
      return { error: uploadError.message, values };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(GIFT_IMAGE_BUCKET).getPublicUrl(path);
    update.image_url = publicUrl;
  }

  // RLS stellt sicher, dass nur die eigene Idee bearbeitet werden kann,
  // auch falls giftId manipuliert wird.
  const { error } = await supabase.from("gifts").update(update).eq("id", giftId);

  if (error) {
    return { error: error.message, values };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
```

- [ ] **Step 5: `next.config.ts` anpassen**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Bild-Upload bei Ideen (A8, Stufe 3, #95): Standardlimit 1 MB reicht
      // für Fotos nicht. 5 MB Spielraum für ein max. 4 MB großes Bild plus
      // multipart-Overhead (siehe updateGift() / MAX_GIFT_IMAGE_BYTES).
      bodySizeLimit: "5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

- [ ] **Step 6: Tests laufen lassen, Erfolg bestätigen**

  Run: `npm test -- src/app/actions/gifts.test.ts`
  Expected: PASS (alle Tests, inklusive der bisherigen)

- [ ] **Step 7: Commit**

```bash
git add src/lib/gift-image.ts src/app/actions/gifts.ts src/app/actions/gifts.test.ts next.config.ts
git commit -m "feat: Bild-Upload in updateGift (#95)"
```

---

## Task 3: Bild anzeigen (GiftItem) + Aufräumen beim Löschen

**Files:**
- Modify: `src/components/gift-item.tsx`
- Modify: `src/app/actions/gifts.ts:146-166` (`deleteGift`)
- Modify: `src/app/dashboard/personen/[id]/page.tsx:43-61`
- Test: `src/components/gift-item.test.tsx`, `src/app/actions/gifts.test.ts`

**Interfaces:**
- Consumes: `GIFT_IMAGE_BUCKET`, `giftImagePath` aus `src/lib/gift-image.ts` (Task 2).
- Produces: `Gift` (aus `gift-item.tsx`) bekommt ein neues Pflichtfeld `image_url: string | null`. `deleteGift(giftId, prevState?)` löscht zusätzlich best-effort die Storage-Datei unter `giftImagePath(user.id, giftId)`.

### Teil A: `deleteGift` räumt die Storage-Datei mit auf

- [ ] **Step 1: Fehlschlagenden Test schreiben** in `src/app/actions/gifts.test.ts`, `describe("deleteGift", ...)`-Block:

```ts
describe("deleteGift", () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } } });
    removeStorageMock.mockReset().mockResolvedValue({ data: {}, error: null });
  });

  // ... bestehende zwei Tests bleiben unverändert ...

  it("löscht die zugehörige Bild-Datei aus dem Storage mit", async () => {
    revalidatePathMock.mockClear();
    deleteMock.mockReset().mockResolvedValue({ error: null });

    await deleteGift("gift-1");

    expect(removeStorageMock).toHaveBeenCalledWith("gift-images", ["user-1/gift-1"]);
  });

  it("löscht die Idee trotzdem, wenn das Entfernen des Bildes fehlschlägt", async () => {
    revalidatePathMock.mockClear();
    deleteMock.mockReset().mockResolvedValue({ error: null });
    removeStorageMock.mockResolvedValue({ data: null, error: { message: "not found" } });

    const result = await deleteGift("gift-1");

    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard", "layout");
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

  Run: `npm test -- src/app/actions/gifts.test.ts`
  Expected: FAIL (`removeStorageMock` wird noch nicht aufgerufen)

- [ ] **Step 3: `deleteGift` implementieren**

```ts
export async function deleteGift(
  giftId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState?: DeleteGiftState,
): Promise<DeleteGiftState> {
  const supabase = await createClient();
  // RLS stellt sicher, dass nur die eigene Idee geloescht werden kann,
  // auch falls giftId manipuliert wird.
  const { error } = await supabase.from("gifts").delete().eq("id", giftId);

  if (error) {
    return { error: error.message };
  }

  // Best-effort: Bild-Datei mitloeschen, falls vorhanden. Schlaegt das fehl
  // (oder gab es nie eine), blockiert das nicht das Loeschen der Idee selbst.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.storage.from(GIFT_IMAGE_BUCKET).remove([giftImagePath(user.id, giftId)]);
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
```

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

  Run: `npm test -- src/app/actions/gifts.test.ts`
  Expected: PASS

### Teil B: Bild in `GiftItem` anzeigen + hochladen

- [ ] **Step 5: Fehlschlagende Tests schreiben** in `src/components/gift-item.test.tsx`

```ts
it("zeigt ein Vorschaubild statt des Platzhalters, wenn gift.image_url gesetzt ist", () => {
  render(
    <GiftItem
      gift={{ ...gift, image_url: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1" }}
      occasions={occasions}
    />,
  );

  const image = screen.getByRole("img", { name: "Kräutergarten-Set" });
  expect(image.getAttribute("src")).toBe(
    "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
  );
  expect(screen.queryByText("Bild")).toBeNull();
});

it("zeigt weiterhin den Platzhalter, wenn kein Bild vorhanden ist", () => {
  render(<GiftItem gift={{ ...gift, image_url: null }} occasions={occasions} />);

  expect(screen.getByText("Bild")).not.toBeNull();
  expect(screen.queryByRole("img")).toBeNull();
});

it("schickt das ausgewählte Bild als Teil der updateGift-FormData mit", async () => {
  updateGiftMock.mockResolvedValue({ success: true });
  render(<GiftItem gift={{ ...gift, image_url: null }} occasions={occasions} />);

  fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
  const file = new File(["bild-inhalt"], "bild.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Bild"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

  await waitFor(() => expect(updateGiftMock).toHaveBeenCalled());
  const submittedFormData = updateGiftMock.mock.calls[0][2] as FormData;
  const submittedFile = submittedFormData.get("image") as File;
  expect(submittedFile.name).toBe("bild.png");
  expect(submittedFile.type).toBe("image/png");
});
```

  Dazu `gift` (Test-Fixture oben in der Datei) um `image_url: null` ergänzen, damit der bestehende Typ weiter kompiliert:

```ts
const gift: Gift = {
  id: "gift-1",
  title: "Kräutergarten-Set",
  link: "https://shop-beispiel.de/kraeutergarten",
  image_url: null,
  status: "idea",
  occasion_id: "occasion-1",
  occasion_name: "Weihnachten",
};
```

- [ ] **Step 6: Tests laufen lassen, Fehlschlag bestätigen**

  Run: `npm test -- src/components/gift-item.test.tsx`
  Expected: FAIL (Typfehler `image_url` fehlt in `Gift`, kein Bild-Input vorhanden)

- [ ] **Step 7: `src/components/gift-item.tsx` anpassen**

  `Gift`-Typ um `image_url: string | null` ergänzen.

  Lesemodus – Platzhalter-Span ersetzen durch:

```tsx
{gift.image_url ? (
  <img
    src={gift.image_url}
    alt={gift.title}
    className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover"
  />
) : (
  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-[11px] text-muted">
    Bild
  </span>
)}
```

  Bearbeiten-Modus – `<form>` bekommt `encType="multipart/form-data"` (für den No-JS-Fallback), direkt nach dem Link-Input wird ergänzt:

```tsx
<input
  type="file"
  name="image"
  aria-label="Bild"
  accept="image/jpeg,image/png,image/webp,image/gif"
  className="rounded-lg border border-input-border bg-input-bg text-sm focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-2.5 py-1.5"
/>
<p className="text-xs text-muted">JPEG, PNG, WebP oder GIF, max. 4 MB.</p>
```

- [ ] **Step 8: Tests laufen lassen, Erfolg bestätigen**

  Run: `npm test -- src/components/gift-item.test.tsx`
  Expected: PASS

- [ ] **Step 9: `src/app/dashboard/personen/[id]/page.tsx` anpassen**

  Im `.select(...)`-String für `gifts` `image_url` ergänzen, im `.map(...)` für `gifts: Gift[]` `image_url: gift.image_url` ergänzen.

- [ ] **Step 10: Gesamten Testlauf + Typecheck bestätigen**

  Run: `npm test` und `npx tsc --noEmit`
  Expected: beide PASS

- [ ] **Step 11: Commit**

```bash
git add src/components/gift-item.tsx src/components/gift-item.test.tsx src/app/actions/gifts.ts src/app/actions/gifts.test.ts src/app/dashboard/personen/\[id\]/page.tsx
git commit -m "feat: Bild bei der Idee anzeigen, Storage-Datei beim Löschen aufräumen (#95)"
```

---

## Task 4: Bild auf der geteilten Ansicht anzeigen

**Files:**
- Modify: `src/components/shared-gift-item.tsx`
- Modify: `src/app/teilen/[token]/page.tsx:60-76`
- Test: `src/components/shared-gift-item.test.tsx`

**Interfaces:**
- Consumes: nichts Neues aus den vorigen Tasks (nur Anzeige, kein Upload auf dieser rein lesenden Seite).
- Produces: `SharedGift` bekommt `image_url: string | null`.

- [ ] **Step 1: Fehlschlagende Tests schreiben** in `src/components/shared-gift-item.test.tsx`

```ts
it("zeigt ein Vorschaubild statt des Platzhalters, wenn gift.image_url gesetzt ist", () => {
  render(
    <SharedGiftItem
      gift={{ ...gift, image_url: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1" }}
      token="token-1"
    />,
  );

  const image = screen.getByRole("img", { name: "Kräutergarten-Set" });
  expect(image.getAttribute("src")).toBe(
    "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
  );
});

it("zeigt weiterhin den Platzhalter, wenn kein Bild vorhanden ist", () => {
  render(<SharedGiftItem gift={{ ...gift, image_url: null }} token="token-1" />);

  expect(screen.getByText("Bild")).not.toBeNull();
  expect(screen.queryByRole("img")).toBeNull();
});
```

  Dazu die lokale `gift`-Fixture der Testdatei um `image_url: null` ergänzen (gleiches Muster wie in Task 3, Step 5).

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

  Run: `npm test -- src/components/shared-gift-item.test.tsx`
  Expected: FAIL

- [ ] **Step 3: `src/components/shared-gift-item.tsx` anpassen**

  `SharedGift`-Typ um `image_url: string | null` ergänzen. Platzhalter-Span (Zeilen 66-70) ersetzen durch dasselbe Muster wie in Task 3, Step 7 (Lesemodus-Variante, kein Upload auf dieser Seite).

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

  Run: `npm test -- src/components/shared-gift-item.test.tsx`
  Expected: PASS

- [ ] **Step 5: `src/app/teilen/[token]/page.tsx` anpassen**

  Im `.select(...)`-String für `gifts` (Zeile 62) `image_url` ergänzen, in der Map-Schleife (Zeilen 67-77) `image_url: gift.image_url` in das gepushte Objekt ergänzen.

- [ ] **Step 6: Gesamten Testlauf + Typecheck bestätigen**

  Run: `npm test` und `npx tsc --noEmit`
  Expected: beide PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/shared-gift-item.tsx src/components/shared-gift-item.test.tsx src/app/teilen/\[token\]/page.tsx
git commit -m "feat: Bild auch auf der geteilten Ansicht anzeigen (#95)"
```
