import { notFound } from "next/navigation";
import Link from "next/link";
import { Gift } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SharedGiftItem, type SharedGift } from "@/components/shared-gift-item";
import { formatBirthday, initials, joinWithUnd } from "@/lib/format";
import { ACTIVE_GIFT_STATUSES } from "@/lib/gift-status";

export const instant = false;

// Geteilte Seiten sollen nicht in Suchmaschinen landen (Wireframe-Annotation
// "Ungültiger Link" / A10, QA6).
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: link, error: linkError } = await supabase
    .from("shared_links")
    .select("id, user_id, shared_link_people(people(id, name, birthday_day, birthday_month))")
    .eq("token", token)
    .single();

  // Ungueltiger (falsches Format) und widerrufener/nicht existierender Token
  // ergeben beide 404 - neutrale Meldung, verraet nichts (Datenschutz, QA6).
  if (linkError || !link) {
    notFound();
  }

  const people = (
    link.shared_link_people as unknown as {
      people: {
        id: string;
        name: string;
        birthday_day: number | null;
        birthday_month: number | null;
      } | null;
    }[]
  )
    .map((entry) => entry.people)
    .filter((person): person is NonNullable<typeof person> => person !== null);

  if (people.length === 0) {
    notFound();
  }

  const personIds = people.map((person) => person.id);

  // Nur aktuelle Ideen/besorgte Geschenke - "given" (dokumentierte, bereits
  // ueberreichte Geschenke, #21/#26) ist private Historie und soll in der
  // oeffentlichen Ansicht nicht auftauchen (QA6/Datensparsamkeit).
  const { data: giftsData } = await supabase
    .from("gifts")
    .select("id, title, link, image_url, status, person_id, purchased_by, occasions(name)")
    .in("person_id", personIds)
    .in("status", ACTIVE_GIFT_STATUSES)
    .order("created_at", { ascending: false });

  const giftsByPerson = new Map<string, SharedGift[]>();
  for (const gift of giftsData ?? []) {
    const list = giftsByPerson.get(gift.person_id) ?? [];
    list.push({
      id: gift.id,
      title: gift.title,
      link: gift.link,
      image_url: gift.image_url,
      status: gift.status,
      purchased_by: gift.purchased_by,
      occasion_name:
        (gift.occasions as unknown as { name: string } | null)?.name ?? null,
    });
    giftsByPerson.set(gift.person_id, list);
  }

  const totalGifts = giftsData?.length ?? 0;
  const purchasedGifts =
    giftsData?.filter((gift) => gift.status === "purchased").length ?? 0;

  const { data: ownerData } = await supabase.auth.admin.getUserById(link.user_id);
  const ownerName =
    (ownerData?.user?.user_metadata?.full_name as string | undefined) ?? "Jemand";

  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Bei nur einer Person bliebe die zweite Grid-Spalte leer und der
  // Container wirkt auf großen Bildschirmen sehr leer (Feedback: "auf PC
  // ist sehr viel freie Fläche") - dann stattdessen die Personen-Karte
  // volle Breite und die Ideen darin zweispaltig, statt die Spalte neben
  // der einen Karte leer zu lassen.
  const singlePerson = people.length === 1;

  return (
    <>
      <SiteHeader badge="Geteilte Ansicht · nur lesen" />
      {/* Gleiche Container-Breite wie Dashboard/Personenseite (dort
          max-w-[1140px] ... 2xl:max-w-[1600px]) statt der bisherigen
          max-w-2xl - Wireframe (geteilte-ansicht.html) nutzt --container:
          1140px fuer 2 Personen nebeneinander. */}
      <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-6 pt-8 pb-14 2xl:max-w-[1600px]">
        <div className="reveal flex items-start gap-4 rounded-2xl border border-line bg-accent-soft p-5">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-accent"
          >
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-heading">
              {ownerName} hat diese Geschenkideen mit dir geteilt
            </p>
            <p className="mt-0.5 text-sm text-muted">
              Du brauchst kein Konto. {ownerName} kann den Link jederzeit
              widerrufen.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-[34px] leading-tight font-bold text-h1">
            Geschenkideen für {joinWithUnd(people.map((person) => person.name))}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-line px-3 py-1 text-muted">
              Stand: {today}
            </span>
            <span className="rounded-full border border-line px-3 py-1 text-muted">
              {totalGifts} {totalGifts === 1 ? "Idee" : "Ideen"}
            </span>
            {purchasedGifts > 0 && (
              <span className="rounded-full border border-success-line bg-success-bg px-3 py-1 font-medium text-success">
                {purchasedGifts} besorgt
              </span>
            )}
          </div>
        </div>

        {/* Nebeneinander ab lg: (Wireframe: 2 Spalten), darunter gestapelt -
            bei nur einer Person stattdessen volle Breite (siehe
            singlePerson oben). */}
        <div
          className={
            singlePerson
              ? "flex flex-col gap-6"
              : "grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
          }
        >
          {people.map((person) => {
            const birthday = formatBirthday(
              person.birthday_day,
              person.birthday_month,
              null,
            );
            const gifts = giftsByPerson.get(person.id) ?? [];
            const purchasedCount = gifts.filter(
              (gift) => gift.status === "purchased",
            ).length;

            return (
              <div
                key={person.id}
                className="surface reveal rounded-2xl p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-avatar text-base font-bold text-text">
                      {initials(person.name)}
                    </span>
                    <div>
                      <p className="text-xl font-bold text-heading">{person.name}</p>
                      {birthday && (
                        <p className="text-sm text-muted">
                          Geburtstag: {birthday}
                        </p>
                      )}
                    </div>
                  </div>
                  {gifts.length > 0 && (
                    <div className="flex w-full flex-col gap-1.5 sm:w-52">
                      <p className="text-sm text-muted">
                        {purchasedCount} von {gifts.length} besorgt
                      </p>
                      <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={gifts.length}
                        aria-valuenow={purchasedCount}
                        aria-label={`Besorgt für ${person.name}`}
                        className="h-2 overflow-hidden rounded-full bg-track"
                      >
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${Math.round((purchasedCount / gifts.length) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {gifts.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    Noch keine Ideen.
                  </p>
                ) : (
                  <ul
                    className={
                      singlePerson
                        ? "mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
                        : "mt-4 flex flex-col gap-3"
                    }
                  >
                    {gifts.map((gift) => (
                      <SharedGiftItem key={gift.id} gift={gift} token={token} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="surface reveal flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
          <div>
            <p className="text-base font-semibold text-heading">
              Du möchtest deine eigenen Geschenkideen festhalten?
            </p>
            <p className="text-sm text-muted">
              Ideen, Anlässe und Geschenke an einem Ort.
            </p>
          </div>
          <Link href="/" className="btn btn-primary">
            Geschenke-Manager kennenlernen
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
