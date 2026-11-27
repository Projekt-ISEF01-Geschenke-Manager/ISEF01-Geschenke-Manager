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

// Simuliert einen ReadableStreamDefaultReader anhand vorgegebener Haeppchen -
// fetchLinkPreview liest per response.body.getReader() statt response.text(),
// damit das Groessenlimit schon waehrend des Empfangs greifen kann.
function makeReader(chunks: Uint8Array[]) {
  let index = 0;
  return {
    read: vi.fn(async () => {
      if (index < chunks.length) {
        return { done: false, value: chunks[index++] };
      }
      return { done: true, value: undefined };
    }),
    cancel: vi.fn(async () => {}),
  };
}

function textReader(text: string) {
  return makeReader([new TextEncoder().encode(text)]);
}

function mockResponse({
  status = 200,
  headers = {},
  url = "",
  text = "",
  reader,
}: {
  status?: number;
  headers?: Record<string, string>;
  url?: string;
  text?: string;
  reader?: ReturnType<typeof makeReader> | { read: () => Promise<never>; cancel: ReturnType<typeof vi.fn> };
}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    body: {
      getReader: () => reader ?? textReader(text),
      cancel: vi.fn(async () => {}),
    },
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
    vi.useRealTimers();
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

  it("lehnt die unspezifische IPv6-Adresse :: ab", async () => {
    lookupMock.mockResolvedValue([{ address: "::", family: 6 }]);
    const result = await fetchLinkPreview("https://leere-adresse.example/");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lehnt reservierte/Multicast-IPv4-Adressen ab (224.0.0.0/3, z. B. Broadcast)", async () => {
    lookupMock.mockResolvedValue([{ address: "255.255.255.255", family: 4 }]);
    const result = await fetchLinkPreview("https://broadcast.example/");
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

  it("gibt null zurück, nach genau Überschreiten der maximalen Redirect-Anzahl", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ status: 302, headers: { location: "https://start.example/naechste" } }),
    );

    const result = await fetchLinkPreview("https://start.example/");
    expect(result).toBeNull();
    // Erster Request + 3 erlaubte Redirects = genau 4 Aufrufe, kein fuenfter.
    expect(fetchMock).toHaveBeenCalledTimes(4);
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

  it("bricht das Streamen ab, sobald die Antwort ohne content-length die Größenobergrenze überschreitet", async () => {
    const oneMb = new Uint8Array(1024 * 1024);
    const reader = makeReader([oneMb, oneMb, oneMb]); // 3 MB, kein content-length-Header gesetzt
    fetchMock.mockResolvedValue(
      mockResponse({ headers: { "content-type": "text/html" }, reader }),
    );

    const result = await fetchLinkPreview("https://riesiger-stream.example/");

    expect(result).toBeNull();
    expect(reader.cancel).toHaveBeenCalled();
  });

  it("bricht ab, wenn die Antwort beim Streamen nie fertig wird (Zeitlimit statt endlosem Warten)", async () => {
    vi.useFakeTimers();
    const neverEndingReader = {
      read: vi.fn(() => new Promise<never>(() => {})),
      cancel: vi.fn(async () => {}),
    };
    fetchMock.mockResolvedValue(
      mockResponse({ headers: { "content-type": "text/html" }, reader: neverEndingReader }),
    );

    const resultPromise = fetchLinkPreview("https://haengt-fuer-immer.example/");
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result).toBeNull();
    expect(neverEndingReader.cancel).toHaveBeenCalled();
  });

  it("gibt null zurück, wenn kein og:image im HTML gefunden wird", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ headers: { "content-type": "text/html" }, text: "<html></html>" }),
    );
    const result = await fetchLinkPreview("https://ohne-vorschau.example/");
    expect(result).toBeNull();
  });

  it("gibt null zurück, wenn ein og:image-Wert kein gültiger http(s)-Link ist (z. B. javascript:)", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        headers: { "content-type": "text/html" },
        url: "https://schadhaft.example/",
        text: '<meta property="og:image" content="javascript:alert(1)">',
      }),
    );
    const result = await fetchLinkPreview("https://schadhaft.example/");
    expect(result).toBeNull();
  });

  it("gibt null zurück statt zu werfen, wenn fetch fehlschlägt", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const result = await fetchLinkPreview("https://nicht-erreichbar.example/");
    expect(result).toBeNull();
  });
});
