"use client";

import { useState } from "react";
import Link from "next/link";
import { initials } from "@/lib/format";
import { PersonForm, type EditablePerson } from "@/components/person-form";
import { DeletePersonButton } from "@/components/delete-person-button";

// Personenseite-Wireframe (Kernansicht 2): Avatar + Personendaten (A1)
// links, "Bearbeiten" und "Ideen teilen" (A10) als Buttons rechts oben.
// "Bearbeiten" klappt das Formular darunter auf/zu, statt auf eine eigene
// Seite zu wechseln.
export function PersonCard({
  person,
  birthdayText,
}: {
  person: EditablePerson;
  birthdayText: string | null;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-avatar text-sm font-bold text-text">
            {initials(person.name)}
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{person.name}</h1>
            {birthdayText && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Geburtstag: {birthdayText}
              </p>
            )}
            {person.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Interessen:
                </span>
                {person.interests.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs dark:border-neutral-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {person.notes && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Notiz: {person.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href={`/dashboard/teilen?person=${person.id}`}
            className="cursor-pointer rounded-full border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            Ideen teilen
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditing((value) => !value);
            }}
            className="cursor-pointer rounded-full border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            {editing ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <PersonForm person={person} />
          <DeletePersonButton
            personId={person.id}
            personName={person.name}
            redirectTo="/dashboard"
          />
        </div>
      )}
    </div>
  );
}
