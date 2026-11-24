// Gemeinsamer HTML-Rahmen fuer alle automatisch verschickten E-Mails
// (Logo/Kopf, weisse Karte, "Einstellungen aendern"-Button, Fuss).
// Inline-gestyltes, tabellenbasiertes HTML (E-Mail-Clients unterstuetzen
// kein externes/eingebettetes CSS zuverlaessig, siehe AGENTS.md
// Design-System) - Farben sind die Hex-Werte der "klassisch"-Palette
// (globals.css, [data-palette="klassisch"]), da E-Mail-Clients weder
// CSS-Variablen noch die palette-Auswahl des Nutzergeraets (die nur in
// localStorage, nicht am Konto haengt) kennen - "klassisch" ist fest
// gewaehlt statt pro Konto dynamisch nachgebildet zu werden.
export const EMAIL_COLORS = {
  bg: "#faf6f4",
  card: "#ffffff",
  heading: "#241b1d",
  muted: "#5f5254",
  accent: "#8a5a66",
  accentSoft: "rgba(138, 90, 102, 0.09)",
  btn: "#6f4a55",
  success: "#067647",
  successSoft: "#ecfdf3",
  line: "#ddcfca",
};

export type RenderEmailLayoutOptions = {
  // Basis-URL der Anwendung (z. B. process.env.NEXT_PUBLIC_SITE_URL) -
  // wird fuer Logo und "Einstellungen aendern"-Link verwendet.
  siteUrl: string;
  // Text fuer das <title>-Element im <head>.
  title: string;
  // Bereits fertig gerendertes HTML-Fragment fuer den Karteninhalt
  // (z. B. Begruessung + Personenliste) - inhaltsspezifisch, von der
  // aufrufenden Stelle gerendert.
  bodyHtml: string;
};

// Vollstaendiges HTML-Dokument (<!doctype html> bis </html>) fuer
// automatisch verschickte E-Mails: Logo/Kopf, weisse Karte mit dem
// uebergebenen `bodyHtml`, "Einstellungen aendern"-Button und Fuss.
// Enthaelt keine inhaltsspezifische Logik - die liegt beim jeweiligen
// Aufrufer (z. B. send-birthday-reminders.ts).
export function renderEmailLayout({ siteUrl, title, bodyHtml }: RenderEmailLayoutOptions): string {
  const settingsUrl = `${siteUrl}/dashboard/einstellungen`;
  const logoUrl = `${siteUrl}/giftwise-symbol-transparent.png`;

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${EMAIL_COLORS.bg}; -webkit-text-size-adjust:100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${EMAIL_COLORS.bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:${EMAIL_COLORS.card}; border-radius:20px; border:1px solid ${EMAIL_COLORS.line};">
            <tr>
              <td align="center" style="padding:32px 32px 24px; border-bottom:1px solid ${EMAIL_COLORS.line};">
                <img src="${logoUrl}" width="48" height="48" alt="Giftwise" style="display:block; margin:0 auto 12px;" />
                <div style="font-size:20px; font-weight:300; letter-spacing:0.18em; color:${EMAIL_COLORS.accent};">GIFTWISE</div>
                <div style="font-size:12px; letter-spacing:0.08em; color:${EMAIL_COLORS.muted}; margin-top:4px;">Klug schenken</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  <tr>
                    <td align="center">
                      <a href="${settingsUrl}" style="display:inline-block; background-color:${EMAIL_COLORS.btn}; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:12px 28px; border-radius:9999px;">Einstellungen ändern</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 32px 28px; border-top:1px solid ${EMAIL_COLORS.line};">
                <p style="margin:0; font-size:12px; color:${EMAIL_COLORS.muted};">Diese E-Mail wurde automatisch von Geschenke-Manager verschickt.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
