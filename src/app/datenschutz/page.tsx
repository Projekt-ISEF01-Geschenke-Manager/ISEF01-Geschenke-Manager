import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function DatenschutzPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-semibold">Datenschutzerklärung</h1>
        <p className="mt-4 text-muted">
          Diese Erklärung informiert dich darüber, welche Daten Giftwise
          verarbeitet, zu welchem Zweck und welche Rechte du dabei hast
          (Art. 13 DSGVO).
        </p>

        <h2 className="mt-8 text-lg font-semibold">1. Verantwortliche Stelle</h2>
        <p className="mt-2 text-muted">
          Verantwortlich im Sinne der DSGVO ist die im{" "}
          <a href="/impressum" className="underline">
            Impressum
          </a>{" "}
          genannte Person.
        </p>

        <h2 className="mt-8 text-lg font-semibold">
          2. Registrierung, Login und Account-Daten
        </h2>
        <p className="mt-2 text-muted">
          Für die Nutzung von Giftwise ist ein Account nötig. Dabei
          verarbeiten wir deine E-Mail-Adresse und dein Passwort (verschlüsselt
          gespeichert). Die Registrierung erfordert eine
          Bestätigung über einen Link, den du per E-Mail erhältst; erst danach
          ist dein Account nutzbar. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO (Erfüllung des Nutzungsverhältnisses).
        </p>
        <p className="mt-2 text-muted">
          Um Missbrauch zu verhindern (z. B. automatisierte Login- oder
          Registrierungsversuche), begrenzen wir die Anzahl der Versuche je
          E-Mail-Adresse in einem kurzen Zeitfenster. Dabei wird kurzzeitig
          die E-Mail-Adresse, die Art des Versuchs und der Zeitpunkt
          gespeichert. Rechtsgrundlage ist unser berechtigtes Interesse an
          einem sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO).
        </p>

        <h2 className="mt-8 text-lg font-semibold">
          3. Personen, Anlässe und Geschenkideen
        </h2>
        <p className="mt-2 text-muted">
          Giftwise speichert die Daten, die du selbst einträgst: Namen und
          optional Geburtstag, Interessen und Notizen zu Personen, für die du
          Geschenke planst, sowie Anlässe und Geschenkideen (Titel,
          Beschreibung, Link, Status). Diese Daten sind ausschließlich für
          dich sichtbar – andere Nutzer:innen haben keinen Zugriff darauf.
        </p>
        <p className="mt-2 text-muted">
          Wichtig: Diese Daten betreffen meist andere, reale Personen (z. B.
          Familie oder Freunde), die selbst keinen Account bei Giftwise haben.
          Du trägst diese Daten freiwillig ein, um die App zu nutzen; wir
          erheben sie nicht direkt bei den betroffenen Personen. Bitte trage
          hier nur Informationen ein, bei denen du dazu berechtigt bist.
        </p>

        <h2 className="mt-8 text-lg font-semibold">4. Geschenkideen teilen</h2>
        <p className="mt-2 text-muted">
          Wenn du einen Freigabe-Link erstellst, können die von dir
          ausgewählten Personen und deren Geschenkideen über diesen Link
          angesehen werden, ohne sich anzumelden. Der Link enthält einen
          zufällig erzeugten, nicht erratbaren Code; wer ihn nicht kennt, kann
          die Inhalte nicht sehen. Du kannst einen Freigabe-Link jederzeit
          widerrufen.
        </p>

        <h2 className="mt-8 text-lg font-semibold">5. Cookies</h2>
        <p className="mt-2 text-muted">
          Giftwise verwendet nur ein technisch notwendiges Cookie, das deine
          Anmeldung (Session) aufrechterhält. Es dient keinem Tracking und
          keiner Werbung, daher ist dafür keine Einwilligung erforderlich
          (§ 25 Abs. 2 TTDSG, Art. 6 Abs. 1 lit. f DSGVO).
        </p>

        <h2 className="mt-8 text-lg font-semibold">
          6. Eingesetzte Dienstleister
        </h2>
        <p className="mt-2 text-muted">
          Für den Betrieb von Giftwise setzen wir folgende Dienstleister als
          Auftragsverarbeiter ein:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>
            <strong>Supabase</strong> – Datenbank und Authentifizierung;
            speichert sämtliche oben genannten Daten
          </li>
          <li>
            <strong>Vercel</strong> – Hosting der Webanwendung
          </li>
          <li>
            <strong>Resend</strong> – Versand der Bestätigungs-E-Mail bei der
            Registrierung
          </li>
        </ul>
        <p className="mt-2 text-muted">
          Mit allen Dienstleistern bestehen bzw. werden Vereinbarungen zur
          Auftragsverarbeitung getroffen.
        </p>

        <h2 className="mt-8 text-lg font-semibold">7. Speicherdauer</h2>
        <p className="mt-2 text-muted">
          Account- und Nutzungsdaten speichern wir, solange dein Account
          besteht. Die Daten zur Missbrauchsprävention (Abschnitt 2) werden
          nach kurzer Zeit automatisch gelöscht. Nach einer Löschung deines
          Accounts (siehe Abschnitt 8) werden auch die zugehörigen Daten
          gelöscht.
        </p>

        <h2 className="mt-8 text-lg font-semibold">
          8. Deine Rechte
        </h2>
        <p className="mt-2 text-muted">
          Du hast das Recht auf Auskunft über deine gespeicherten Daten
          (Art. 15 DSGVO), auf Berichtigung (Art. 16 DSGVO), auf Löschung
          (Art. 17 DSGVO), auf Einschränkung der Verarbeitung (Art. 18
          DSGVO), auf Datenübertragbarkeit (Art. 20 DSGVO) sowie auf
          Widerspruch gegen die Verarbeitung (Art. 21 DSGVO). Eine
          eigenständige Löschfunktion für deinen Account bieten wir aktuell
          noch nicht an; wende dich dafür bitte an die im Impressum genannte
          Kontaktadresse.
        </p>
        <p className="mt-2 text-muted">
          Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde
          zu beschweren, wenn du der Meinung bist, dass die Verarbeitung
          deiner Daten gegen die DSGVO verstößt.
        </p>

        <h2 className="mt-8 text-lg font-semibold">9. Stand</h2>
        <p className="mt-2 text-muted">
          Diese Datenschutzerklärung wurde zuletzt am 21.11.2026 aktualisiert.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
