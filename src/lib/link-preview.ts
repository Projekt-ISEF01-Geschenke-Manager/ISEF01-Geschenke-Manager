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
  blockList.addSubnet("100.64.0.0", 10, "ipv4");
  blockList.addSubnet("127.0.0.0", 8, "ipv4");
  blockList.addSubnet("169.254.0.0", 16, "ipv4"); // inkl. Cloud-Metadata 169.254.169.254
  blockList.addSubnet("172.16.0.0", 12, "ipv4");
  blockList.addSubnet("192.168.0.0", 16, "ipv4");
  blockList.addSubnet("::1", 128, "ipv6");
  blockList.addSubnet("fe80::", 10, "ipv6");
  blockList.addSubnet("fc00::", 7, "ipv6");
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
