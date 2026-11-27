import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { EventEmitter } from "node:events";
import { PassThrough, Readable } from "node:stream";
import type { RequestOptions } from "node:https";

const lookupMock = vi.fn();
const requestMock = vi.fn();
vi.mock("node:http", () => ({ request: (...args: unknown[]) => requestMock(...args) }));
vi.mock("node:https", () => ({ request: (...args: unknown[]) => requestMock(...args) }));
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
  text = "",
  stream = Readable.from([Buffer.from(text)]),
}: {
  status?: number;
  headers?: Record<string, string>;
  text?: string;
  stream?: Readable;
}) {
  return Object.assign(stream, { statusCode: status, headers });
}

const PUBLIC_IP = { address: "93.184.216.34", family: 4 };
const PRIVATE_IP = { address: "127.0.0.1", family: 4 };

describe("fetchLinkPreview", () => {
  const responseMock = vi.fn();

  beforeEach(() => {
    lookupMock.mockReset().mockResolvedValue([PUBLIC_IP]);
    responseMock.mockReset();
    requestMock.mockReset().mockImplementation(
      (options: RequestOptions, onResponse: (response: Readable) => void) => {
        const outgoing = new EventEmitter();
        return Object.assign(outgoing, {
          end() {
            responseMock().then((response: Readable) => {
              options.signal?.addEventListener("abort", () => {
                response.destroy(new Error("aborted"));
              }, { once: true });
              onResponse(response);
            }, (error: Error) => outgoing.emit("error", error));
          },
        });
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lehnt eine nicht-http(s) URL ab, ohne DNS aufzulösen", async () => {
    const result = await fetchLinkPreview("ftp://example.com/datei");
    expect(result).toBeNull();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it.each(["http://127.0.0.1/", "http://[::1]/"])(
    "lehnt die private IP-Adresse in %s ohne DNS-Auflösung ab",
    async (url) => {
      expect(await fetchLinkPreview(url)).toBeNull();
      expect(lookupMock).not.toHaveBeenCalled();
      expect(requestMock).not.toHaveBeenCalled();
    },
  );

  it("lehnt ab, wenn die Domain auf eine private IP aufgelöst wird", async () => {
    lookupMock.mockResolvedValue([PRIVATE_IP]);
    const result = await fetchLinkPreview("https://interne-seite.example/");
    expect(result).toBeNull();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("lehnt ab, wenn eine von mehreren aufgelösten IPs privat ist", async () => {
    lookupMock.mockResolvedValue([PUBLIC_IP, PRIVATE_IP]);
    const result = await fetchLinkPreview("https://mixed.example/");
    expect(result).toBeNull();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("lehnt ab, wenn die Domain auf eine IPv4-in-IPv6-eingebettete private Adresse aufgelöst wird", async () => {
    lookupMock.mockResolvedValue([{ address: "::ffff:127.0.0.1", family: 6 }]);
    const result = await fetchLinkPreview("https://getarnt.example/");
    expect(result).toBeNull();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("lehnt die unspezifische IPv6-Adresse :: ab", async () => {
    lookupMock.mockResolvedValue([{ address: "::", family: 6 }]);
    const result = await fetchLinkPreview("https://leere-adresse.example/");
    expect(result).toBeNull();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("lehnt reservierte/Multicast-IPv4-Adressen ab (224.0.0.0/3, z. B. Broadcast)", async () => {
    lookupMock.mockResolvedValue([{ address: "255.255.255.255", family: 4 }]);
    const result = await fetchLinkPreview("https://broadcast.example/");
    expect(result).toBeNull();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("lehnt ab, wenn die DNS-Auflösung fehlschlägt", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    const result = await fetchLinkPreview("https://nicht-aufloesbar.example/");
    expect(result).toBeNull();
  });

  it("ermittelt das og:image einer öffentlichen Seite", async () => {
    responseMock.mockResolvedValue(
      mockResponse({
        headers: { "content-type": "text/html" },
        text: '<meta property="og:image" content="https://cdn.example/bild.png">',
      }),
    );
    const result = await fetchLinkPreview("https://shop.example/produkt");
    expect(result).toBe("https://cdn.example/bild.png");
    expect(lookupMock).toHaveBeenCalledExactlyOnceWith("shop.example", { all: true });
    expect(requestMock).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      hostname: PUBLIC_IP.address,
      servername: "shop.example",
      path: "/produkt",
      headers: expect.objectContaining({ host: "shop.example" }),
    }), expect.any(Function));
  });

  it("löst ein relatives og:image gegen die finale URL auf", async () => {
    responseMock.mockResolvedValue(
      mockResponse({
        headers: { "content-type": "text/html" },
        text: '<meta property="og:image" content="/bilder/bild.png">',
      }),
    );
    const result = await fetchLinkPreview("https://shop.example/produkt");
    expect(result).toBe("https://shop.example/bilder/bild.png");
  });

  it("folgt Redirects bis zum Limit und prüft jeden Hop erneut per DNS", async () => {
    responseMock
      .mockResolvedValueOnce(
        mockResponse({ status: 302, headers: { location: "https://ziel.example/seite" } }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          headers: { "content-type": "text/html" },
          text: '<meta property="og:image" content="https://cdn.example/bild.png">',
        }),
      );

    const result = await fetchLinkPreview("https://start.example/");
    expect(result).toBe("https://cdn.example/bild.png");
    expect(lookupMock).toHaveBeenCalledTimes(2);
  });

  it("lehnt einen Redirect auf eine private IP ab, auch wenn der ursprüngliche Host öffentlich war", async () => {
    lookupMock.mockResolvedValueOnce([PUBLIC_IP]).mockResolvedValueOnce([PRIVATE_IP]);
    responseMock.mockResolvedValueOnce(
      mockResponse({ status: 302, headers: { location: "https://internes-ziel.example/" } }),
    );

    const result = await fetchLinkPreview("https://start.example/");
    expect(result).toBeNull();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("gibt null zurück, nach genau Überschreiten der maximalen Redirect-Anzahl", async () => {
    responseMock.mockResolvedValue(
      mockResponse({ status: 302, headers: { location: "https://start.example/naechste" } }),
    );

    const result = await fetchLinkPreview("https://start.example/");
    expect(result).toBeNull();
    // Erster Request + 3 erlaubte Redirects = genau 4 Aufrufe, kein fuenfter.
    expect(requestMock).toHaveBeenCalledTimes(4);
  });

  it("ignoriert Antworten, die kein HTML sind", async () => {
    responseMock.mockResolvedValue(
      mockResponse({ headers: { "content-type": "application/json" }, text: "{}" }),
    );
    const result = await fetchLinkPreview("https://api.example/");
    expect(result).toBeNull();
  });

  it("ignoriert Antworten, die laut content-length zu groß sind", async () => {
    responseMock.mockResolvedValue(
      mockResponse({
        headers: { "content-type": "text/html", "content-length": String(2 * 1024 * 1024 + 1) },
      }),
    );
    const result = await fetchLinkPreview("https://riesig.example/");
    expect(result).toBeNull();
  });

  it("bricht das Streamen ab, sobald die Antwort ohne content-length die Größenobergrenze überschreitet", async () => {
    const oneMb = new Uint8Array(1024 * 1024);
    const stream = Readable.from([oneMb, oneMb, oneMb]);
    responseMock.mockResolvedValue(
      mockResponse({ headers: { "content-type": "text/html" }, stream }),
    );

    const result = await fetchLinkPreview("https://riesiger-stream.example/");

    expect(result).toBeNull();
    expect(stream.destroyed).toBe(true);
  });

  it("bricht ab, wenn die Antwort beim Streamen nie fertig wird (Zeitlimit statt endlosem Warten)", async () => {
    vi.useFakeTimers();
    const stream = new PassThrough();
    responseMock.mockResolvedValue(
      mockResponse({ headers: { "content-type": "text/html" }, stream }),
    );

    const resultPromise = fetchLinkPreview("https://haengt-fuer-immer.example/");
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result).toBeNull();
    expect(stream.destroyed).toBe(true);
  });

  it("gibt null zurück, wenn kein og:image im HTML gefunden wird", async () => {
    responseMock.mockResolvedValue(
      mockResponse({ headers: { "content-type": "text/html" }, text: "<html></html>" }),
    );
    const result = await fetchLinkPreview("https://ohne-vorschau.example/");
    expect(result).toBeNull();
  });

  it("gibt null zurück, wenn ein og:image-Wert kein gültiger http(s)-Link ist (z. B. javascript:)", async () => {
    responseMock.mockResolvedValue(
      mockResponse({
        headers: { "content-type": "text/html" },
        text: '<meta property="og:image" content="javascript:alert(1)">',
      }),
    );
    const result = await fetchLinkPreview("https://schadhaft.example/");
    expect(result).toBeNull();
  });

  it("gibt null zurück statt zu werfen, wenn der HTTP-Aufruf fehlschlägt", async () => {
    responseMock.mockRejectedValue(new Error("network down"));
    const result = await fetchLinkPreview("https://nicht-erreichbar.example/");
    expect(result).toBeNull();
  });
});
