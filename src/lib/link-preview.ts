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
//
// Keine eigene Regel fuer IPv4-in-IPv6 ("::ffff:0:0/96"): BlockList matcht
// eine IPv4-mapped-IPv6-Adresse (z. B. "::ffff:127.0.0.1") bei check(addr,
// "ipv6") automatisch gegen die hier gesetzten IPv4-Regeln - eine eigene
// "::ffff:0:0/96"-Subnetz-Regel wurde beim Testen empirisch bestaetigt, dass
// sie stattdessen *jede* IPv4-Adresse bei check(addr, "ipv4") faelschlich
// als privat erkennen laesst (Node-Eigenheit, keine Dokumentationsaussage
// dazu gefunden - direkt in Node verifiziert).
function buildPrivateIpBlockList(): BlockList {
  const blockList = new BlockList();
  blockList.addSubnet("0.0.0.0", 8, "ipv4");
  blockList.addSubnet("10.0.0.0", 8, "ipv4");
  blockList.addSubnet("100.64.0.0", 10, "ipv4"); // CGNAT (RFC 6598)
  blockList.addSubnet("127.0.0.0", 8, "ipv4");
  blockList.addSubnet("169.254.0.0", 16, "ipv4"); // inkl. Cloud-Metadata 169.254.169.254
  blockList.addSubnet("172.16.0.0", 12, "ipv4");
  blockList.addSubnet("192.0.0.0", 24, "ipv4"); // IETF-Protokoll-Zuweisungen (RFC 6890)
  blockList.addSubnet("192.168.0.0", 16, "ipv4");
  blockList.addSubnet("198.18.0.0", 15, "ipv4"); // Benchmarking (RFC 2544)
  blockList.addSubnet("224.0.0.0", 3, "ipv4"); // Multicast + reserviert + Broadcast (224.0.0.0-255.255.255.255)
  blockList.addSubnet("::", 128, "ipv6"); // unspecified - erreicht lokale "::"-Listener (Review-Fund)
  blockList.addSubnet("::1", 128, "ipv6");
  blockList.addSubnet("64:ff9b::", 96, "ipv6"); // NAT64 (RFC 6052)
  blockList.addSubnet("2002::", 16, "ipv6"); // 6to4 (RFC 3056)
  blockList.addSubnet("fe80::", 10, "ipv6");
  blockList.addSubnet("fc00::", 7, "ipv6");
  blockList.addSubnet("ff00::", 8, "ipv6"); // Multicast
  return blockList;
}

const PRIVATE_IP_BLOCK_LIST = buildPrivateIpBlockList();

// Bekannte Luecke (Review-Fund): isPublicHostname() loest den Hostnamen per
// DNS auf und prueft DIESE Antwort, fetch() loest denselben Hostnamen aber
// intern noch einmal selbst auf - zwischen beiden Aufloesungen koennte ein
// DNS-Rebinding-Angriff (TTL 0, zweite Antwort zeigt auf eine private IP)
// theoretisch durchschlupfen. Ein Fix dafuer braeuchte einen eigenen
// Connector, der die Ziel-IP fuer den Socket fixiert, aber per SNI/Hostname
// weiter TLS-validiert (z. B. ueber undici's Agent({connect})) - das liess
// sich beim Recherchieren nicht zuverlaessig aus der Doku verifizieren,
// deshalb hier bewusst nicht umgesetzt. Mindert bereits: fehlerhafte DNS-
// Antworten werden abgelehnt, nicht nur eine von mehreren IPs pro Antwort,
// und auf Vercel (Serverless-Funktionen ohne nennenswertes internes Netz)
// ist die Angriffsflaeche dafuer gering.
async function isPublicHostname(hostname: string): Promise<boolean> {
  if (hostname.toLowerCase().replace(/\.$/, "") === "localhost") return false;
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

// Wartet auf reader.read(), gibt aber sofort auf, sobald signal abbricht -
// verlaesst sich nicht blind darauf, dass der zugrunde liegende Stream das
// AbortSignal selbst respektiert (liess sich aus der undici-Doku nicht
// zweifelsfrei verifizieren, siehe Review-Fund zum fehlenden Zeitlimit beim
// Streamen).
function readRespectingAbort(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const onAbort = () => reject(new Error("aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
    reader.read().then(
      (result) => {
        signal.removeEventListener("abort", onAbort);
        resolve(result);
      },
      (err: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

async function fetchHtmlSafely(
  url: string,
  redirectsLeft: number,
  signal: AbortSignal,
): Promise<{ html: string; finalUrl: string } | null> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!(await isPublicHostname(parsed.hostname))) return null;

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      signal,
      redirect: "manual",
      headers: { "user-agent": "GeschenkeManagerLinkPreview/1.0" },
    });
  } catch {
    return null;
  }

  if (response.status >= 300 && response.status < 400) {
    // Redirect-Antworten werden nicht gelesen, nur die Verbindung freigeben.
    await response.body?.cancel().catch(() => {});
    const location = response.headers.get("location");
    if (!location || redirectsLeft <= 0) return null;
    return fetchHtmlSafely(new URL(location, parsed).toString(), redirectsLeft - 1, signal);
  }

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return null;

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_RESPONSE_BYTES) return null;

  const reader = response.body?.getReader();
  if (!reader) return null;

  // Streamt statt response.text() zu nutzen (Review-Fund): so kann die
  // Groessenobergrenze schon waehrend des Empfangs greifen statt erst nach
  // einer vollstaendig eingelesenen (potenziell riesigen oder nie
  // endenden) Antwort, und das AbortSignal bricht auch waehrend des Lesens
  // ab, nicht nur beim anfaenglichen fetch()-Aufruf.
  const decoder = new TextDecoder();
  let html = "";
  let received = 0;
  try {
    while (true) {
      const { done, value } = await readRespectingAbort(reader, signal);
      if (done) break;
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      html += decoder.decode(value, { stream: true });
    }
  } catch {
    await reader.cancel().catch(() => {});
    return null;
  }

  return { html, finalUrl: response.url || parsed.toString() };
}

// Best-effort: liefert bei jedem Fehler/jeder Ablehnung null statt zu
// werfen, damit ein fehlgeschlagener Abruf nie das Speichern der Idee selbst
// verhindert (siehe createGift/updateGift). Ein einziges Zeitlimit gilt fuer
// den gesamten Vorgang (alle Redirects + das Lesen der Antwort), nicht neu
// pro Netzwerk-Request - sonst koennte eine langsam streamende oder nie
// endende Antwort die Server Action beliebig lange offenhalten (Review-
// Fund: das urspruengliche clearTimeout() griff schon nach den Response-
// Headern, bevor der Body ueberhaupt gelesen wurde).
export async function fetchLinkPreview(link: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const result = await fetchHtmlSafely(link, MAX_REDIRECTS, controller.signal);
    if (!result) return null;

    const ogImage = extractOgImage(result.html);
    if (!ogImage) return null;

    const resolved = new URL(ogImage, result.finalUrl).toString();
    return isValidHttpUrl(resolved) ? resolved : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
