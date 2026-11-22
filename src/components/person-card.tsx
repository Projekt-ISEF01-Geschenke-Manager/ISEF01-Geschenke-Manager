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
    <div className="surface reveal rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-5">
          <span className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full bg-avatar text-xl font-bold text-text">
            {initials(person.name)}
          </span>
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold">{person.name}</h1>
            {birthdayText && (
              <p className="text-sm text-muted">
                Geburtstag: {birthdayText}
              </p>
            )}
            {person.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-muted">
                  Interessen:
                </span>
                {person.interests.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line px-2.5 py-0.5 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {person.notes && (
              <p className="mt-2 text-sm text-muted">
                Notiz: {person.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2.5">
          <Link
            href={`/dashboard/teilen?person=${person.id}`}
            className="btn btn-secondary flex w-[130px]"
          >
            Ideen teilen
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditing((value) => !value);
            }}
            className="btn btn-secondary w-[130px]"
          >
            {editing ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5">
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
