import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
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
    <main className="mx-auto flex w-full max-w-[1140px] flex-1 flex-col gap-7 px-6 pt-8 pb-14 2xl:max-w-[1600px]">
      <Link href="/dashboard" className="btn btn-secondary btn-sm w-fit">
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
        Zurück zur Übersicht
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-[34px] font-bold text-h1">Geteilte Links</h1>
        <p className="max-w-xl text-sm text-muted">
          Mit einem Link können andere die Ideen ausgewählter Personen ansehen
          und markieren, was schon besorgt ist.
        </p>
      </div>

      {/* Zwei Spalten wie auf der Übersicht: links der Erstellen-Bereich,
          rechts die Liste der bestehenden Links. */}
      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="neuer-link"
          className="surface reveal flex min-w-0 flex-1 basis-[320px] flex-col gap-4 rounded-2xl p-6 max-lg:max-w-full lg:max-w-[380px]"
        >
          <h2 id="neuer-link" className="text-xl font-bold text-heading">
            Neuen Link erstellen
          </h2>
          {!people || people.length === 0 ? (
            <p className="text-sm text-muted">
              Lege zuerst eine Person an, um Ideen teilen zu können.
            </p>
          ) : (
            <ShareLinkForm
              people={people}
              preselectedPersonId={preselectedPersonId}
            />
          )}
        </section>

        <section
          aria-labelledby="bestehende-links"
          className="flex min-w-0 flex-[999] basis-[560px] flex-col gap-4"
        >
          <h2 id="bestehende-links" className="text-xl font-bold text-heading">
            Deine Links {links.length > 0 ? `(${links.length})` : ""}
          </h2>
          {links.length === 0 ? (
            <div className="reveal rounded-2xl border border-dashed border-input-border p-6">
              <p className="font-semibold text-heading">Noch keine Links erstellt</p>
              <p className="mt-1 text-sm text-muted">
                Wähle links eine oder mehrere Personen und erstelle deinen
                ersten Link.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
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
        </section>
      </div>
    </main>
  );
}
