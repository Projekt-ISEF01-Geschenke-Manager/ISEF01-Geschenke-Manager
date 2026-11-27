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

  it("lehnt ab, wenn die Domain auf eine IPv4-in-IPv6-eingebettete private Adresse aufgelöst wird", async () => {
    lookupMock.mockResolvedValue([{ address: "::ffff:127.0.0.1", family: 6 }]);
    const result = await fetchLinkPreview("https://getarnt.example/");
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
