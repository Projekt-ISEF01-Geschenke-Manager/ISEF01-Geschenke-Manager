"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { initials } from "@/lib/format";

export type PersonCard = {
  id: string;
  name: string;
  birthday: string | null;
  interests: string[];
  ideaCount: number;
  purchasedCount: number;
};

// Sucheingabe filtert clientseitig (alle Personen sind schon geladen,
// kein eigener Request je Tastendruck noetig). Ueberschrift + Suchfeld in
// einer Zeile, Personenkarten mit Avatar/Chevron als Grid - nach
// Design-Vorgabe (Screenshot, 31.10.2026). onAddPerson oeffnet dasselbe
// Popup wie der "+ Person anlegen"-Button oben auf der Seite (zweiter Weg,
// eine Person anzulegen).
export function PersonSearchList({
  people,
  onAddPerson,
}: {
  people: PersonCard[];
  onAddPerson: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = people.filter((person) =>
    person.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex min-w-0 flex-[999] basis-[560px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-heading">
          Deine Personen {people.length > 0 ? `(${people.length})` : ""}
        </h2>
        {people.length > 0 && (
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Person suchen …"
            className="h-12 w-[260px] max-w-full rounded-xl border border-input-border bg-input-bg px-4 text-[15px] text-text placeholder:text-muted"
          />
        )}
      </div>

      {people.length === 0 && (
        <p className="text-sm text-muted">Lege deine erste Person an.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {people.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted sm:col-span-2">Keine Person gefunden.</p>
        )}

        {filtered.map((person) => (
          <Link
            key={person.id}
            href={`/dashboard/personen/${person.id}`}
            className="flex items-center gap-4 rounded-2xl bg-tile p-5 transition hover:opacity-85"
          >
            <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-avatar text-lg font-bold text-text">
              {initials(person.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold text-heading">{person.name}</p>
              {person.birthday && (
                <p className="mt-1 text-[15px] text-muted">
                  Geburtstag: {person.birthday}
                </p>
              )}
              {person.interests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {person.interests.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-tag-border px-3 py-1 text-sm text-tag-text"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[15px] text-text">
                {person.ideaCount} {person.ideaCount === 1 ? "Idee" : "Ideen"} ·{" "}
                {person.purchasedCount}{" "}
                {person.purchasedCount === 1 ? "Geschenk" : "Geschenke"}
              </p>
            </div>
            <ChevronRight className="h-6 w-6 shrink-0 text-muted" />
          </Link>
        ))}

        <button
          type="button"
          onClick={onAddPerson}
          className="flex min-h-[130px] items-center justify-center rounded-2xl border border-dashed border-input-border p-5 text-lg font-medium text-accent transition hover:opacity-85"
        >
          + Person anlegen
        </button>
      </div>
    </div>
  );
}
