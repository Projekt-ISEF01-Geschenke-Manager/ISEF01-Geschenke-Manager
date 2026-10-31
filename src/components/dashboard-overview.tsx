"use client";

import { useRef } from "react";
import Link from "next/link";
import { PersonForm } from "./person-form";
import { GiftForm } from "./gift-form";
import { PersonSearchList, type PersonCard } from "./person-search-list";
import { Modal } from "./modal";
import { monthAbbreviation } from "@/lib/format";
import { formatDaysUntil } from "@/lib/upcoming";

type Option = { id: string; name: string };

export type UpcomingEntry = {
  key: string;
  day: number;
  month: number;
  daysUntil: number;
  label: string;
  href: string | null;
  detail: string;
};

// Besitzt den Zustand der beiden Popups (Person/Idee anlegen) - ein
// gemeinsamer Client-Wrapper, weil sowohl die Buttons oben auf der Seite
// als auch die gestrichelte Kachel unten in PersonSearchList dasselbe
// "Person anlegen"-Popup oeffnen sollen (Wireframe-Annotation 8).
export function DashboardOverview({
  people,
  personCards,
  occasions,
  upcoming,
  weihnachten,
}: {
  people: Option[];
  personCards: PersonCard[];
  occasions: Option[];
  upcoming: UpcomingEntry[];
  weihnachten: { peopleCount: number; purchasedCount: number } | null;
}) {
  const personDialogRef = useRef<HTMLDialogElement>(null);
  const giftDialogRef = useRef<HTMLDialogElement>(null);

  const openPersonModal = () => personDialogRef.current?.showModal();
  const openGiftModal = () => giftDialogRef.current?.showModal();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Deine Übersicht</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={openPersonModal}
            className="cursor-pointer rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/10 active:scale-95"
          >
            + Person anlegen
          </button>
          {people.length > 0 && (
            <button
              type="button"
              onClick={openGiftModal}
              className="cursor-pointer rounded-full bg-btn-bg px-4 py-2 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95"
            >
              + Idee erfassen
            </button>
          )}
        </div>
      </div>

      {/* Nur untereinander auf schmalen Bildschirmen - ab lg nebeneinander
          (Nächste-Anlässe-Spalte mit fester Breite, Personen-Spalte flexibel). */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-6">
          {upcoming.length > 0 && (
            <div className="rounded-2xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <h2 className="text-lg font-semibold">Nächste Anlässe</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {upcoming.map((entry) => {
                  const content = (
                    <>
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-100 text-xs leading-tight dark:bg-neutral-800">
                        <span className="font-semibold">{entry.day}.</span>
                        <span>{monthAbbreviation(entry.month)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{entry.label}</span>
                        <span className="block text-sm text-neutral-600 dark:text-neutral-400">
                          {formatDaysUntil(entry.daysUntil)} · {entry.detail}
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li key={entry.key}>
                      {entry.href ? (
                        <Link
                          href={entry.href}
                          className="flex items-center gap-3 rounded-2xl border border-neutral-300 p-3 transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 rounded-2xl border border-neutral-300 p-3 dark:border-neutral-700">
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {weihnachten && weihnachten.peopleCount > 0 && (
            <div className="rounded-2xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <h2 className="font-semibold">Weihnachtsstatus</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {weihnachten.purchasedCount} von {weihnachten.peopleCount}{" "}
                {weihnachten.peopleCount === 1 ? "Person" : "Personen"} besorgt
              </p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            Deine Personen {people.length > 0 ? `(${people.length})` : ""}
          </h2>
          <div className="mt-2">
            <PersonSearchList people={personCards} onAddPerson={openPersonModal} />
          </div>
        </div>
      </div>

      <Modal dialogRef={personDialogRef} title="Person anlegen">
        <PersonForm />
      </Modal>
      <Modal dialogRef={giftDialogRef} title="Idee erfassen">
        <GiftForm people={people} occasions={occasions} />
      </Modal>
    </>
  );
}
