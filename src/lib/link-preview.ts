import "server-only";
import { BlockList, isIP } from "node:net";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
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

async function resolvePublicAddress(hostname: string): Promise<string | null> {
  if (hostname.toLowerCase().replace(/\.$/, "") === "localhost") return null;
  const family = isIP(hostname);
  const records = family ? [{ address: hostname, family }] : await lookup(hostname, { all: true });

  if (records.some(
    (record) => PRIVATE_IP_BLOCK_LIST.check(record.address, record.family === 6 ? "ipv6" : "ipv4"),
  )) return null;

  return records[0]?.address ?? null;
}

function requestHtml(
  parsed: URL,
  hostname: string,
  address: string,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  const request = parsed.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    // Der Socket verbindet sich direkt mit der geprüften IP. Host-Header
    // und TLS-Zertifikatsprüfung verwenden weiterhin den Namen aus der URL.
    const outgoing = request({
      hostname: address,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      servername: isIP(hostname) ? "" : hostname,
      agent: false,
      signal,
      headers: {
        host: parsed.host,
        "accept-encoding": "identity",
        "user-agent": "GeschenkeManagerLinkPreview/1.0",
      },
    }, resolve);
    outgoing.on("error", reject);
    outgoing.end();
  });
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
  signal: AbortSignal,
): Promise<{ html: string; finalUrl: string } | null> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  const address = await resolvePublicAddress(hostname);
  if (!address || signal.aborted) return null;

  const response = await requestHtml(parsed, hostname, address, signal);
  try {
    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400) {
      const location = response.headers.location;
      if (!location || redirectsLeft <= 0) return null;
      return fetchHtmlSafely(new URL(location, parsed).toString(), redirectsLeft - 1, signal);
    }
    if (status < 200 || status >= 300) return null;
    if (!response.headers["content-type"]?.includes("text/html")) return null;
    if (Number(response.headers["content-length"]) > MAX_RESPONSE_BYTES) return null;

    const decoder = new TextDecoder();
    let html = "";
    let received = 0;
    for await (const chunk of response) {
      received += chunk.byteLength;
      if (received > MAX_RESPONSE_BYTES) return null;
      html += decoder.decode(chunk, { stream: true });
    }

    return { html: html + decoder.decode(), finalUrl: parsed.toString() };
  } finally {
    response.destroy();
  }
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
