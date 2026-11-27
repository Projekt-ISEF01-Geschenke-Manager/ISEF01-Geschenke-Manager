# Automatische Link-Vorschau Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hat eine Idee einen Link aber kein eigenes Bild, wird automatisch ein Vorschaubild von der verlinkten Seite angezeigt (`og:image`-Meta-Tag), ohne das Bild selbst herunterzuladen oder zu kopieren (Issue #223, Erweiterung über #95 hinaus).

**Architecture:** Beim Speichern einer Idee (`createGift`/`updateGift`) wird serverseitig, SSRF-geschützt, die verlinkte Seite abgerufen und ihr `og:image`-Tag ausgelesen; nur die gefundene Bild-URL wird in einer neuen Spalte `gifts.link_preview_url` zwischengespeichert (kein Download/Kopie der Bild-Datei selbst - die Anzeige lädt das Bild per `<img src>` direkt vom fremden Server, das ist ein Request des Browsers der Betrachterin/des Betrachters, nicht unseres Servers). Die Vorschau wird nur neu ermittelt, wenn sich der Link tatsächlich ändert, nicht bei jedem Speichern. Anzeige-Priorität bei der Idee: eigenes hochgeladenes Bild > Link-Vorschau > Platzhalter.

**Tech Stack:** Next.js Server Actions, globales `fetch`, `node:dns/promises` + `node:net` (`BlockList`, stabil seit Node v14.18/v15.0 - bewusst **keine** zusätzliche npm-Abhängigkeit für die IP-Bereichs-Prüfung, siehe Begründung unten), Vitest.

**Spec:** Brainstorming-Konversation in dieser Session (keine separate Spec-Datei) + Issue [#223](https://github.com/Projekt-ISEF01-Geschenke-Manager/ISEF01-Geschenke-Manager/issues/223). Vom Nutzer bestätigt: nur Hotlink (kein Download), og:image per Regex (kein HTML-Parser), SSRF-Schutz über `node:net`'s `BlockList` statt einer npm-Bibliothek (Rechercheergebnis: gängige npm-Pakete für IP-Bereichs-Checks wie `private-ip` hatten reale CVEs durch fehlerhafte Bereichs-Erkennung vor Version 2.0; `BlockList` nutzt Nodes eigene, dafür verwendete IP-Parsing-Logik).

## Global Constraints

- **Kein Download/keine Kopie** des fremden Bilds - nur die URL wird gespeichert, die Anzeige bleibt ein Hotlink.
- **SSRF-Schutz ist zwingend** beim serverseitigen Abruf der Link-Seite: nur http(s), DNS-Auflösung + Sperren privater/interner IP-Bereiche (IPv4: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`; IPv6: `::1/128`, `fe80::/10`, `fc00::/7`, `::ffff:0:0/96` für IPv4-in-IPv6), Redirects **nicht automatisch folgen** (`redirect: "manual"`), jeder Redirect-Hop wird erneut vollständig geprüft (Protokoll + DNS), maximal 3 Redirects, Timeout 5 Sekunden, Antwort muss `content-type: text/html` sein, Antwortgröße per `content-length`-Header begrenzt auf 2 MB (best-effort, kein hartes Byte-Cap während des Streamens - abgefedert durch den Timeout; das ist eine bewusste Vereinfachung für den Umfang dieses Issues).
- **Keine neue npm-Abhängigkeit** für die IP-Bereichs-Prüfung - `node:net`'s `BlockList` mit `addSubnet()`/`check()` (nicht die komfortableren `PRIVATE_RANGES`/`addCIDRs()`, die laut Node-Doku erst mit v26.8.0 existieren - zu neu, um sich darauf zu verlassen, ohne die tatsächliche Produktions-Node-Version zu kennen).
- Die Vorschau wird nur **beim Anlegen/Ändern des Links** ermittelt (best-effort, Fehler bleiben `null`), nicht bei jedem Seitenaufruf und nicht bei jedem Speichern einer Idee ohne Link-Änderung.
- Anzeige-Priorität: `gift.image_url` (eigenes Bild) > `gift.link_preview_url` (automatische Vorschau) > Platzhalter.
- Migration wird **nicht automatisch** gegen das Live-Projekt angewendet - siehe Task 1, letzter Schritt (wie bei #95).

## Review Focus

- Link verweist auf einen öffentlichen Hostnamen, der aber per Redirect auf eine private/interne IP umleitet (SSRF über Redirect) → muss abgelehnt werden, der Redirect darf nicht verfolgt werden. (Task 2)
- Ein Hostname löst sich per DNS auf mehrere IPs auf, von denen nur eine privat ist → die gesamte Anfrage muss trotzdem abgelehnt werden (nicht nur die erste/zufällig geprüfte IP). (Task 2)
- Seite liefert kein (oder ein fehlerhaftes) `og:image`-Tag, liefert keine HTML-Antwort, oder antwortet nicht innerhalb des Timeouts → keine Vorschau, aber auch kein für die Nutzerin/den Nutzer sichtbarer Fehler beim Speichern der Idee. (Task 2 + Task 3)
- Der Link einer Idee wird nachträglich geändert oder ganz entfernt → die zwischengespeicherte alte Vorschau darf nicht stehen bleiben (weder beim Ändern auf einen neuen Link noch beim Entfernen des Links). (Task 3)
- Eine Idee hat sowohl ein eigenes hochgeladenes Bild als auch eine automatische Link-Vorschau → das eigene Bild muss angezeigt werden, nie die automatische Vorschau. (Task 4)

---

## Task 1: `gifts.link_preview_url` Spalte

**Files:**
- Create: `supabase/migrations/20261127140000_gift_link_preview_url.sql`
- Modify: `docs/database-schema.md`

**Interfaces:**
- Produces: Spalte `gifts.link_preview_url` (text, nullable).

Kein automatisierter Test möglich (reine SQL-Migration). Verifikation erfolgt beim Anwenden (letzter Schritt).

- [ ] **Step 1: Migration schreiben**

```sql
-- ============================================================================
-- Geschenke-Manager: Spalte fuer automatische Link-Vorschau (A8, #223)
-- ============================================================================
-- Ausführliche Erklärung: docs/database-schema.md
-- Anwenden: Supabase Dashboard -> SQL Editor -> diesen Inhalt einfügen -> Run
-- ============================================================================

alter table public.gifts
  add column link_preview_url text;

comment on column public.gifts.link_preview_url is
  'Automatisch ermitteltes Vorschaubild (og:image) der in "link" hinterlegten Seite - nur die externe Bild-URL (Hotlink), keine eigene Kopie. Null, wenn kein Link gesetzt ist oder keine Vorschau ermittelt werden konnte.';
```

- [ ] **Step 2: `docs/database-schema.md` aktualisieren**

  In der Spalten-Tabelle von `gifts` (Abschnitt zu `gifts`) eine Zeile ergänzen:

  | `link_preview_url` | text | Automatisch ermitteltes Vorschaubild (`og:image`) der Link-Seite, nur Hotlink (#223) |

  Direkt darunter einen kurzen Absatz ergänzen, der analog zum `gift-images`-Absatz in Abschnitt 3 erklärt: SSRF-geschützter serverseitiger Abruf der Link-Seite (nur beim Speichern, nicht bei jedem Seitenaufruf), es wird nur die gefundene Bild-URL gespeichert, nie das Bild selbst - Details siehe `src/lib/link-preview.ts`.

- [ ] **Step 3: Migration anwenden**

  Nicht automatisch ausführen. Den Nutzer fragen, ob die Migration jetzt über die Supabase-MCP-Werkzeuge gegen das Live-Projekt angewendet werden soll, oder ob er sie selbst über das Dashboard einspielt. Erst nach dessen Entscheidung fortfahren.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261127140000_gift_link_preview_url.sql docs/database-schema.md
git commit -m "feat: Spalte fuer automatische Link-Vorschau anlegen (#223)"
```

---

## Task 2: `src/lib/link-preview.ts` - SSRF-geschützter og:image-Abruf

**Files:**
- Create: `src/lib/link-preview.ts`
- Test: `src/lib/link-preview.test.ts`

**Interfaces:**
- Produces: `export function extractOgImage(html: string): string | null` (reine Funktion). `export async function fetchLinkPreview(link: string): Promise<string | null>` - gibt bei jedem Fehler/jeder Ablehnung `null` zurück, wirft nie.
- Consumes: `isValidHttpUrl` aus `@/lib/url` (bereits vorhanden).

- [ ] **Step 1: Fehlschlagende Tests für `extractOgImage` schreiben** in `src/lib/link-preview.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const lookupMock = vi.fn();
vi.mock("node:dns/promises", () => ({
  lookup: (...args: unknown[]) => lookupMock(...args),
}));

const { extractOgImage, fetchLinkPreview } = await import("./link-preview");

describe("extractOgImage", () => {
  it("findet og:image, wenn content nach property steht", () => {
    const html = '<meta property="og:image" content="https://cdn.example/bild.png">';
    expect(extractOgImage(html)).toBe("https://cdn.example/bild.png");
  });

  it("findet og:image, wenn content vor property steht", () => {
    const html = '<meta content="https://cdn.example/bild.png" property="og:image">';
    expect(extractOgImage(html)).toBe("https://cdn.example/bild.png");
  });

  it("akzeptiert auch name=\"og:image\" statt property", () => {
    const html = '<meta name="og:image" content="https://cdn.example/bild.png">';
    expect(extractOgImage(html)).toBe("https://cdn.example/bild.png");
  });

  it("ignoriert andere meta-Tags und findet nur og:image", () => {
    const html = `
      <meta property="og:title" content="Falscher Treffer">
      <meta property="og:image" content="https://cdn.example/richtig.png">
    `;
    expect(extractOgImage(html)).toBe("https://cdn.example/richtig.png");
  });

  it("gibt null zurück, wenn kein og:image-Tag vorhanden ist", () => {
    expect(extractOgImage("<html><head></head></html>")).toBeNull();
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

  Run: `npm test -- src/lib/link-preview.test.ts`
  Expected: FAIL (Modul `./link-preview` existiert noch nicht)

- [ ] **Step 3: `extractOgImage` in `src/lib/link-preview.ts` implementieren**

```ts
import "server-only";

export function extractOgImage(html: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (!/\b(?:property|name)\s*=\s*["']og:image["']/i.test(tag)) continue;
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i);
    if (contentMatch) return contentMatch[1];
  }
  return null;
}
```

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

  Run: `npm test -- src/lib/link-preview.test.ts`
  Expected: `extractOgImage`-Tests PASS, `fetchLinkPreview` ist noch nicht exportiert/existiert nicht (wird in Step 5-8 ergänzt)

- [ ] **Step 5: Fehlschlagende Tests für `fetchLinkPreview` schreiben**, im selben File ergänzen

```ts
function mockResponse({
  status = 200,
  headers = {},
  url = "",
  text = "",
}: {
  status?: number;
  headers?: Record<string, string>;
  url?: string;
  text?: string;
}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    text: async () => text,
  };
}

const PUBLIC_IP = { address: "93.184.216.34", family: 4 };
const PRIVATE_IP = { address: "127.0.0.1", family: 4 };

describe("fetchLinkPreview", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    lookupMock.mockReset().mockResolvedValue([PUBLIC_IP]);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lehnt eine nicht-http(s) URL ab, ohne DNS aufzulösen", async () => {
    const result = await fetchLinkPreview("ftp://example.com/datei");
    expect(result).toBeNull();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("lehnt ab, wenn die Domain auf eine private IP aufgelöst wird", async () => {
    lookupMock.mockResolvedValue([PRIVATE_IP]);
    const result = await fetchLinkPreview("https://interne-seite.example/");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lehnt ab, wenn eine von mehreren aufgelösten IPs privat ist", async () => {
    lookupMock.mockResolvedValue([PUBLIC_IP, PRIVATE_IP]);
    const result = await fetchLinkPreview("https://mixed.example/");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lehnt ab, wenn die DNS-Auflösung fehlschlägt", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    const result = await fetchLinkPreview("https://nicht-aufloesbar.example/");
    expect(result).toBeNull();
  });

  it("ermittelt das og:image einer öffentlichen Seite", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        headers: { "content-type": "text/html" },
        url: "https://shop.example/produkt",
        text: '<meta property="og:image" content="https://cdn.example/bild.png">',
      }),
    );
    const result = await fetchLinkPreview("https://shop.example/produkt");
    expect(result).toBe("https://cdn.example/bild.png");
  });

  it("löst ein relatives og:image gegen die finale URL auf", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        headers: { "content-type": "text/html" },
        url: "https://shop.example/produkt",
        text: '<meta property="og:image" content="/bilder/bild.png">',
      }),
    );
    const result = await fetchLinkPreview("https://shop.example/produkt");
    expect(result).toBe("https://shop.example/bilder/bild.png");
  });

  it("folgt Redirects bis zum Limit und prüft jeden Hop erneut per DNS", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockResponse({ status: 302, headers: { location: "https://ziel.example/seite" } }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          headers: { "content-type": "text/html" },
          url: "https://ziel.example/seite",
          text: '<meta property="og:image" content="https://cdn.example/bild.png">',
        }),
      );

    const result = await fetchLinkPreview("https://start.example/");
    expect(result).toBe("https://cdn.example/bild.png");
    expect(lookupMock).toHaveBeenCalledTimes(2);
  });

  it("lehnt einen Redirect auf eine private IP ab, auch wenn der ursprüngliche Host öffentlich war", async () => {
    lookupMock.mockResolvedValueOnce([PUBLIC_IP]).mockResolvedValueOnce([PRIVATE_IP]);
    fetchMock.mockResolvedValueOnce(
      mockResponse({ status: 302, headers: { location: "https://internes-ziel.example/" } }),
    );

    const result = await fetchLinkPreview("https://start.example/");
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gibt null zurück, nach Überschreiten der maximalen Redirect-Anzahl", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ status: 302, headers: { location: "https://start.example/naechste" } }),
    );

    const result = await fetchLinkPreview("https://start.example/");
    expect(result).toBeNull();
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it("ignoriert Antworten, die kein HTML sind", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ headers: { "content-type": "application/json" }, text: "{}" }),
    );
    const result = await fetchLinkPreview("https://api.example/");
    expect(result).toBeNull();
  });

  it("ignoriert Antworten, die laut content-length zu groß sind", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        headers: { "content-type": "text/html", "content-length": String(2 * 1024 * 1024 + 1) },
      }),
    );
    const result = await fetchLinkPreview("https://riesig.example/");
    expect(result).toBeNull();
  });

  it("gibt null zurück, wenn kein og:image im HTML gefunden wird", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ headers: { "content-type": "text/html" }, text: "<html></html>" }),
    );
    const result = await fetchLinkPreview("https://ohne-vorschau.example/");
    expect(result).toBeNull();
  });

  it("gibt null zurück statt zu werfen, wenn fetch fehlschlägt", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const result = await fetchLinkPreview("https://nicht-erreichbar.example/");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 6: Tests laufen lassen, Fehlschlag bestätigen**

  Run: `npm test -- src/lib/link-preview.test.ts`
  Expected: FAIL (`fetchLinkPreview` noch nicht implementiert)

- [ ] **Step 7: `fetchLinkPreview` in `src/lib/link-preview.ts` implementieren**

```ts
import "server-only";
import { BlockList } from "node:net";
import { lookup } from "node:dns/promises";
import { isValidHttpUrl } from "@/lib/url";

const FETCH_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

// node:net's BlockList nutzt Nodes eigene IP-Parsing-Logik statt einer
// selbstgebauten Regex (genau die Fehlerquelle, die mehrere npm-Pakete fuer
// private-IP-Checks schon echte CVEs gekostet hat). addSubnet()/check() sind
// seit Node v14.18/v15.0 stabil - die komfortableren PRIVATE_RANGES/
// addCIDRs() kamen erst mit v26.8.0 und werden hier bewusst nicht
// vorausgesetzt.
function buildPrivateIpBlockList(): BlockList {
  const blockList = new BlockList();
  blockList.addSubnet("0.0.0.0", 8, "ipv4");
  blockList.addSubnet("10.0.0.0", 8, "ipv4");
  blockList.addSubnet("100.64.0.0", 10, "ipv4");
  blockList.addSubnet("127.0.0.0", 8, "ipv4");
  blockList.addSubnet("169.254.0.0", 16, "ipv4"); // inkl. Cloud-Metadata 169.254.169.254
  blockList.addSubnet("172.16.0.0", 12, "ipv4");
  blockList.addSubnet("192.168.0.0", 16, "ipv4");
  blockList.addSubnet("::1", 128, "ipv6");
  blockList.addSubnet("fe80::", 10, "ipv6");
  blockList.addSubnet("fc00::", 7, "ipv6");
  blockList.addSubnet("::ffff:0:0", 96, "ipv6"); // IPv4-in-IPv6 eingebettet
  return blockList;
}

const PRIVATE_IP_BLOCK_LIST = buildPrivateIpBlockList();

async function isPublicHostname(hostname: string): Promise<boolean> {
  if (hostname.toLowerCase() === "localhost") return false;
  let records;
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    return false;
  }
  if (records.length === 0) return false;
  return records.every(
    (record) => !PRIVATE_IP_BLOCK_LIST.check(record.address, record.family === 6 ? "ipv6" : "ipv4"),
  );
}

export function extractOgImage(html: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (!/\b(?:property|name)\s*=\s*["']og:image["']/i.test(tag)) continue;
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i);
    if (contentMatch) return contentMatch[1];
  }
  return null;
}

async function fetchHtmlSafely(
  url: string,
  redirectsLeft: number,
): Promise<{ html: string; finalUrl: string } | null> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!(await isPublicHostname(parsed.hostname))) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "manual",
      headers: { "user-agent": "GeschenkeManagerLinkPreview/1.0" },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location || redirectsLeft <= 0) return null;
    return fetchHtmlSafely(new URL(location, parsed).toString(), redirectsLeft - 1);
  }

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return null;

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_RESPONSE_BYTES) return null;

  const html = await response.text();
  if (html.length > MAX_RESPONSE_BYTES) return null;

  return { html, finalUrl: response.url || parsed.toString() };
}

// Best-effort: liefert bei jedem Fehler/jeder Ablehnung null statt zu
// werfen, damit ein fehlgeschlagener Abruf nie das Speichern der Idee selbst
// verhindert (siehe createGift/updateGift).
export async function fetchLinkPreview(link: string): Promise<string | null> {
  try {
    const result = await fetchHtmlSafely(link, MAX_REDIRECTS);
    if (!result) return null;

    const ogImage = extractOgImage(result.html);
    if (!ogImage) return null;

    const resolved = new URL(ogImage, result.finalUrl).toString();
    return isValidHttpUrl(resolved) ? resolved : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 8: Tests laufen lassen, Erfolg bestätigen**

  Run: `npm test -- src/lib/link-preview.test.ts`
  Expected: PASS (alle Tests)

- [ ] **Step 9: Commit**

```bash
git add src/lib/link-preview.ts src/lib/link-preview.test.ts
git commit -m "feat: SSRF-geschuetzten og:image-Abruf fuer Link-Vorschau implementieren (#223)"
```

---

## Task 3: Link-Vorschau in `createGift`/`updateGift` ermitteln

**Files:**
- Modify: `src/app/actions/gifts.ts`
- Test: `src/app/actions/gifts.test.ts`

**Interfaces:**
- Consumes: `fetchLinkPreview` aus `src/lib/link-preview.ts` (Task 2) - wird in den Tests komplett gemockt (kein echtes DNS/Fetch in Action-Tests).
- Produces: `createGift` setzt `link_preview_url` beim Insert immer (null, falls kein Link oder keine Vorschau ermittelbar). `updateGift` setzt `link_preview_url` im Update-Payload **nur**, wenn sich `link` gegenüber dem gespeicherten Wert tatsächlich ändert - sonst bleibt der Payload wie bisher ohne diesen Key.

- [ ] **Step 1: Fehlschlagende Tests schreiben** in `src/app/actions/gifts.test.ts`

  Mock ergänzen (oberer Teil der Datei):

```ts
const fetchLinkPreviewMock = vi.fn();
vi.mock("@/lib/link-preview", () => ({
  fetchLinkPreview: (link: string) => fetchLinkPreviewMock(link),
}));
```

  `from()` im bestehenden `vi.mock("@/lib/supabase/server", ...)` um `select` für die `gifts`-Tabelle ergänzen (wird für die "hat sich der Link geändert"-Prüfung in `updateGift` gebraucht):

```ts
from: (table: string) => ({
  insert: (values: unknown) => insertMock(table, values),
  select: (columns: string) => ({
    eq: (column: string, value: unknown) => ({
      single: () => selectSingleMock(table, columns, column, value),
    }),
  }),
  update: (values: unknown) => ({
    eq: (column: string, value: unknown) =>
      eqMockForUpdate(table, values, column, value),
  }),
  delete: () => ({
    eq: (column: string, value: unknown) =>
      eqMockForDelete(table, column, value),
  }),
}),
```

  Dazu oben `const selectSingleMock = vi.fn();` ergänzen.

  `describe("createGift", ...)`'s `beforeEach` ergänzen und Tests hinzufügen:

```ts
beforeEach(() => {
  revalidatePathMock.mockClear();
  insertMock.mockReset();
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  fetchLinkPreviewMock.mockReset().mockResolvedValue(null);
});

// ... bestehende Tests bleiben unverändert ...

it("ermittelt eine Link-Vorschau beim Anlegen, wenn ein Link angegeben ist", async () => {
  insertMock.mockResolvedValue({ error: null });
  fetchLinkPreviewMock.mockResolvedValue("https://cdn.example/bild.png");

  await createGift(undefined, formData(validFields));

  expect(fetchLinkPreviewMock).toHaveBeenCalledWith(validFields.link);
  expect(insertMock).toHaveBeenCalledWith(
    "gifts",
    expect.objectContaining({ link_preview_url: "https://cdn.example/bild.png" }),
  );
});

it("speichert link_preview_url als null, wenn kein Link angegeben ist", async () => {
  insertMock.mockResolvedValue({ error: null });

  await createGift(
    undefined,
    formData({ personId: "person-1", title: "Gutschein", link: "", occasionId: "" }),
  );

  expect(fetchLinkPreviewMock).not.toHaveBeenCalled();
  expect(insertMock).toHaveBeenCalledWith(
    "gifts",
    expect.objectContaining({ link_preview_url: null }),
  );
});

it("speichert link_preview_url als null, wenn keine Vorschau ermittelt werden konnte", async () => {
  insertMock.mockResolvedValue({ error: null });
  fetchLinkPreviewMock.mockResolvedValue(null);

  const result = await createGift(undefined, formData(validFields));

  expect(result).toEqual({ success: true });
  expect(insertMock).toHaveBeenCalledWith(
    "gifts",
    expect.objectContaining({ link_preview_url: null }),
  );
});
```

  `describe("updateGift", ...)`'s `beforeEach` ergänzen (Default: gespeicherter Link = `validFields.link`, damit alle bestehenden Tests, die `validFields` unverändert einreichen, weiterhin **keinen** `link_preview_url`-Key im Update-Payload erzeugen):

```ts
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
  selectSingleMock.mockReset().mockResolvedValue({ data: { link: validFields.link }, error: null });
  fetchLinkPreviewMock.mockReset().mockResolvedValue(null);
});
```

  Die bestehende Test "erlaubt das Entfernen von Link und Anlass (nur Titel bleibt Pflicht)" anpassen (Link wird entfernt -> `link_preview_url` wird jetzt mit auf `null` gesetzt):

```ts
it("erlaubt das Entfernen von Link und Anlass (nur Titel bleibt Pflicht)", async () => {
  updateMock.mockResolvedValue({ error: null });
  const result = await updateGift(
    "gift-1",
    undefined,
    formData({ personId: "person-1", title: "Gutschein", link: "", occasionId: "" }),
  );
  expect(result).toEqual({ success: true });
  expect(updateMock).toHaveBeenCalledWith(
    "gifts",
    { title: "Gutschein", link: null, occasion_id: null, link_preview_url: null },
    "id",
    "gift-1",
  );
});
```

  Neue Tests ergänzen:

```ts
it("ermittelt die Link-Vorschau neu, wenn sich der Link ändert", async () => {
  updateMock.mockResolvedValue({ error: null });
  selectSingleMock.mockResolvedValue({ data: { link: "https://alt-beispiel.de/" }, error: null });
  fetchLinkPreviewMock.mockResolvedValue("https://cdn.example/neu.png");

  await updateGift("gift-1", undefined, formData(validFields));

  expect(fetchLinkPreviewMock).toHaveBeenCalledWith(validFields.link);
  expect(updateMock).toHaveBeenCalledWith(
    "gifts",
    expect.objectContaining({ link_preview_url: "https://cdn.example/neu.png" }),
    "id",
    "gift-1",
  );
});

it("lässt die Link-Vorschau unverändert, wenn sich der Link nicht ändert", async () => {
  updateMock.mockResolvedValue({ error: null });
  // selectSingleMock-Default aus beforeEach entspricht bereits validFields.link

  await updateGift("gift-1", undefined, formData(validFields));

  expect(fetchLinkPreviewMock).not.toHaveBeenCalled();
  expect(updateMock).toHaveBeenCalledWith(
    "gifts",
    { title: "Kräutergarten-Set", link: validFields.link, occasion_id: "occasion-1" },
    "id",
    "gift-1",
  );
});

it("löscht die gespeicherte Link-Vorschau, wenn der Link entfernt wird", async () => {
  updateMock.mockResolvedValue({ error: null });
  selectSingleMock.mockResolvedValue({ data: { link: validFields.link }, error: null });

  await updateGift(
    "gift-1",
    undefined,
    formData({ personId: "person-1", title: "Gutschein", link: "", occasionId: "" }),
  );

  expect(fetchLinkPreviewMock).not.toHaveBeenCalled();
  expect(updateMock).toHaveBeenCalledWith(
    "gifts",
    { title: "Gutschein", link: null, occasion_id: null, link_preview_url: null },
    "id",
    "gift-1",
  );
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

  Run: `npm test -- src/app/actions/gifts.test.ts`
  Expected: FAIL (neue Erwartungen zu `link_preview_url` nicht erfüllt, `fetchLinkPreview` wird noch nicht importiert/aufgerufen)

- [ ] **Step 3: `createGift`/`updateGift` in `src/app/actions/gifts.ts` anpassen**

  Import ergänzen: `import { fetchLinkPreview } from "@/lib/link-preview";`

  In `createGift`, direkt vor dem `insert`-Aufruf:

```ts
  // Best-effort: Vorschaubild vom Link (og:image) ermitteln, falls ein Link
  // angegeben ist - schlaegt das fehl (keine Seite, kein og:image, Timeout,
  // SSRF-Block), bleibt die Idee trotzdem speicherbar, nur ohne Vorschau.
  const linkPreviewUrl = link ? await fetchLinkPreview(link) : null;

  const { error } = await supabase.from("gifts").insert({
    user_id: user.id,
    person_id: personId,
    occasion_id: occasionId || null,
    title,
    link: link || null,
    link_preview_url: linkPreviewUrl,
  });
```

  In `updateGift`, direkt nach `const supabase = await createClient();` (vor dem bestehenden `update`-Objekt):

```ts
  const { data: currentGift } = await supabase
    .from("gifts")
    .select("link")
    .eq("id", giftId)
    .single();

  const update: Record<string, unknown> = {
    title,
    link: link || null,
    occasion_id: occasionId || null,
  };

  // Vorschaubild vom Link nur neu ermitteln, wenn sich der Link tatsaechlich
  // geaendert hat - sonst wuerde jede Bearbeitung (auch nur Titel/Anlass)
  // unnoetig einen Netzwerk-Request an die fremde Seite ausloesen.
  if (link !== (currentGift?.link ?? "")) {
    update.link_preview_url = link ? await fetchLinkPreview(link) : null;
  }
```

  (Der bestehende Bild-Upload-Block direkt danach bleibt unverändert.)

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

  Run: `npm test -- src/app/actions/gifts.test.ts`
  Expected: PASS (alle Tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/gifts.ts src/app/actions/gifts.test.ts
git commit -m "feat: Link-Vorschau in createGift/updateGift ermitteln (#223)"
```

---

## Task 4: Link-Vorschau anzeigen (Priorität: eigenes Bild > Vorschau > Platzhalter)

**Files:**
- Modify: `src/components/gift-item.tsx`
- Modify: `src/components/shared-gift-item.tsx`
- Modify: `src/app/dashboard/personen/[id]/page.tsx`
- Modify: `src/app/teilen/[token]/page.tsx`
- Test: `src/components/gift-item.test.tsx`, `src/components/shared-gift-item.test.tsx`

**Interfaces:**
- Produces: `Gift` (gift-item.tsx) und `SharedGift` (shared-gift-item.tsx) bekommen `link_preview_url: string | null`.

- [ ] **Step 1: Fehlschlagende Tests schreiben** in `src/components/gift-item.test.tsx`

```ts
it("zeigt die automatische Link-Vorschau, wenn kein eigenes Bild hochgeladen wurde", () => {
  render(
    <GiftItem
      gift={{ ...gift, image_url: null, link_preview_url: "https://cdn.example/vorschau.png" }}
      occasions={occasions}
    />,
  );

  const image = screen.getByRole("img", { name: "Kräutergarten-Set" });
  expect(image.getAttribute("src")).toBe("https://cdn.example/vorschau.png");
});

it("zeigt das eigene Bild statt der Link-Vorschau, wenn beides vorhanden ist", () => {
  render(
    <GiftItem
      gift={{
        ...gift,
        image_url: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
        link_preview_url: "https://cdn.example/vorschau.png",
      }}
      occasions={occasions}
    />,
  );

  const image = screen.getByRole("img", { name: "Kräutergarten-Set" });
  expect(image.getAttribute("src")).toBe(
    "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
  );
});
```

  Die `gift`-Fixture um `link_preview_url: null` ergänzen (gleiches Muster wie `image_url` zuvor).

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

  Run: `npm test -- src/components/gift-item.test.tsx`
  Expected: FAIL

- [ ] **Step 3: `src/components/gift-item.tsx` anpassen**

  `Gift`-Typ um `link_preview_url: string | null` ergänzen. Bild-Anzeige im Lesemodus:

```tsx
{gift.image_url ?? gift.link_preview_url ? (
  <img
    src={gift.image_url ?? gift.link_preview_url ?? undefined}
    alt={gift.title}
    className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover"
  />
) : (
  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-[11px] text-muted">
    Bild
  </span>
)}
```

- [ ] **Step 4: Tests laufen lassen, Erfolg bestätigen**

  Run: `npm test -- src/components/gift-item.test.tsx`
  Expected: PASS

- [ ] **Step 5: Gleiches Muster für `src/components/shared-gift-item.tsx`**

  Fehlschlagende Tests analog zu Step 1 in `src/components/shared-gift-item.test.tsx` (gleiche zwei Fälle: nur Link-Vorschau, eigenes Bild hat Vorrang), dann `SharedGift`-Typ um `link_preview_url: string | null` ergänzen und dieselbe Anzeige-Logik wie in Step 3 übernehmen.

  Run: `npm test -- src/components/shared-gift-item.test.tsx` - erst FAIL, nach der Anpassung PASS.

- [ ] **Step 6: `src/app/dashboard/personen/[id]/page.tsx` anpassen**

  `.select(...)`-String für `gifts` um `link_preview_url` ergänzen, im `.map(...)` für `gifts: Gift[]` `link_preview_url: gift.link_preview_url` ergänzen.

- [ ] **Step 7: `src/app/teilen/[token]/page.tsx` anpassen**

  `.select(...)`-String für `gifts` um `link_preview_url` ergänzen, in der Map-Schleife `link_preview_url: gift.link_preview_url` ergänzen.

- [ ] **Step 8: Gesamten Testlauf + Typecheck bestätigen**

  Run: `npm test` und `npx tsc --noEmit`
  Expected: beide PASS

- [ ] **Step 9: Commit**

```bash
git add src/components/gift-item.tsx src/components/gift-item.test.tsx src/components/shared-gift-item.tsx src/components/shared-gift-item.test.tsx src/app/dashboard/personen/\[id\]/page.tsx src/app/teilen/\[token\]/page.tsx
git commit -m "feat: automatische Link-Vorschau bei der Idee anzeigen (#223)"
```
