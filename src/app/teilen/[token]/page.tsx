import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SharedGiftItem, type SharedGift } from "@/components/shared-gift-item";
import { formatBirthday, initials, joinWithUnd } from "@/lib/format";

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

  const { data: giftsData } = await supabase
    .from("gifts")
    .select("id, title, link, status, person_id, occasions(name)")
    .in("person_id", personIds)
    .order("created_at", { ascending: false });

  const giftsByPerson = new Map<string, SharedGift[]>();
  for (const gift of giftsData ?? []) {
    const list = giftsByPerson.get(gift.person_id) ?? [];
    list.push({
      id: gift.id,
      title: gift.title,
      link: gift.link,
      status: gift.status,
      occasion_name:
        (gift.occasions as unknown as { name: string } | null)?.name ?? null,
    });
    giftsByPerson.set(gift.person_id, list);
  }

  const totalGifts = giftsData?.length ?? 0;

  const { data: ownerData } = await supabase.auth.admin.getUserById(link.user_id);
  const ownerName =
    (ownerData?.user?.user_metadata?.full_name as string | undefined) ?? "Jemand";

  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <>
      <SiteHeader badge="Geteilte Ansicht · nur lesen" />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <div className="rounded-2xl border border-neutral-300 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="font-medium">Hinweis</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            {ownerName} hat diese Geschenkideen mit dir geteilt. Du brauchst
            kein Konto. {ownerName} kann den Link jederzeit widerrufen.
          </p>
        </div>

        <div>
          <h1 className="text-2xl font-semibold">
            Geschenkideen für {joinWithUnd(people.map((person) => person.name))}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Stand: {today} · {totalGifts}{" "}
            {totalGifts === 1 ? "Idee" : "Ideen"}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {people.map((person) => {
            const birthday = formatBirthday(
              person.birthday_day,
              person.birthday_month,
              null,
            );
            const gifts = giftsByPerson.get(person.id) ?? [];

            return (
              <div
                key={person.id}
                className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium dark:bg-neutral-800">
                    {initials(person.name)}
                  </span>
                  <div>
                    <p className="font-medium">{person.name}</p>
                    {birthday && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Geburtstag: {birthday}
                      </p>
                    )}
                  </div>
                </div>

                {gifts.length === 0 ? (
                  <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                    Noch keine Ideen.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
                    {gifts.map((gift) => (
                      <SharedGiftItem key={gift.id} gift={gift} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          Du möchtest deine eigenen Geschenkideen festhalten?{" "}
          <Link href="/" className="underline">
            Geschenke-Manager kennenlernen
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
