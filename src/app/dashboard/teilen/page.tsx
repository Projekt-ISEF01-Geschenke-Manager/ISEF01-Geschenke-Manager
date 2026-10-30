import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShareLinkForm } from "@/components/share-link-form";
import { SharedLinkItem } from "@/components/shared-link-item";

export const instant = false;

export default async function SharedLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const { person: preselectedPersonId } = await searchParams;
  const { supabase } = await requireUser();

  const { data: people } = await supabase
    .from("people")
    .select("id, name")
    .order("name");

  const { data: linksData } = await supabase
    .from("shared_links")
    .select("id, token, created_at, shared_link_people(people(name))")
    .order("created_at", { ascending: false });

  const links = (linksData ?? []).map((link) => ({
    id: link.id,
    token: link.token,
    createdAt: link.created_at,
    peopleNames: (
      link.shared_link_people as unknown as { people: { name: string } | null }[]
    )
      .map((entry) => entry.people?.name)
      .filter((name): name is string => Boolean(name)),
  }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <Link
          href="/dashboard"
          className="w-fit text-sm text-neutral-600 hover:underline dark:text-neutral-400"
        >
          ‹ Zurück zur Übersicht
        </Link>

        <h1 className="text-2xl font-semibold">Ideen teilen</h1>

        <div className="rounded-2xl border-2 border-neutral-900 p-4 dark:border-white">
          {!people || people.length === 0 ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Lege zuerst eine Person an, um Ideen teilen zu können.
            </p>
          ) : (
            <ShareLinkForm
              people={people}
              preselectedPersonId={preselectedPersonId}
            />
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold">Geteilte Links</h2>
          {links.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Noch keine Links erstellt.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {links.map((link) => (
                <SharedLinkItem
                  key={link.id}
                  linkId={link.id}
                  token={link.token}
                  peopleNames={link.peopleNames}
                  createdAt={link.createdAt}
                />
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
