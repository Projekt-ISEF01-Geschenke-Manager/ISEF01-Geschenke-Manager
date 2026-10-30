"use client";

import { useState } from "react";
import Link from "next/link";

export type PersonCard = {
  id: string;
  name: string;
  birthday: string | null;
  interests: string[];
  ideaCount: number;
  purchasedCount: number;
};

// Sucheingabe filtert clientseitig (alle Personen sind schon geladen,
// kein eigener Request je Tastendruck noetig) - siehe Wireframe-Annotation
// "Deine Personen" (Suche nach Namen).
export function PersonSearchList({ people }: { people: PersonCard[] }) {
  const [query, setQuery] = useState("");
  const filtered = people.filter((person) =>
    person.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      {people.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Person suchen …"
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-600"
        />
      )}

      {people.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Lege deine erste Person an.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Keine Person gefunden.
        </p>
      ) : (
        filtered.map((person) => (
          <Link
            key={person.id}
            href={`/dashboard/personen/${person.id}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-300 p-4 transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            <div>
              <p className="font-medium">{person.name}</p>
              {person.birthday && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Geburtstag: {person.birthday}
                </p>
              )}
              {person.interests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {person.interests.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs dark:bg-neutral-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right text-sm text-neutral-500 dark:text-neutral-400">
              <p>{person.ideaCount} {person.ideaCount === 1 ? "Idee" : "Ideen"}</p>
              <p>
                {person.purchasedCount}{" "}
                {person.purchasedCount === 1 ? "Geschenk" : "Geschenke"}
              </p>
            </div>
          </Link>
        ))
      )}

      {/* Zweiter Weg, eine Person anzulegen (Wireframe-Annotation 8) -
          #person-anlegen springt zum Formular oben auf der Seite. Oeffnet
          das <details> explizit, statt sich auf das (nicht in jedem
          Browser garantierte) automatische Aufklappen beim Anker-Sprung zu
          verlassen - und zwar VOR dem Sprung, damit die Seite nicht erst
          an die falsche Stelle scrollt und danach durch das Aufklappen
          verspringt. */}
      <a
        href="#person-anlegen"
        onClick={() => {
          const details = document.getElementById("person-anlegen");
          if (details instanceof HTMLDetailsElement) {
            details.open = true;
          }
        }}
        className="flex items-center justify-center rounded-2xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
      >
        + Person anlegen
      </a>
    </div>
  );
}
