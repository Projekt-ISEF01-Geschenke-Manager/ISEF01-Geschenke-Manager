"use client";

import { useRef } from "react";
import { PersonForm } from "./person-form";
import { GiftForm } from "./gift-form";
import { PersonSearchList, type PersonCard } from "./person-search-list";
import { Modal } from "./modal";
import { monthAbbreviation } from "@/lib/format";

type Option = { id: string; name: string };

export type UpcomingEntry = {
  key: string;
  day: number;
  month: number;
  daysUntil: number;
  title: string;
  subtitle: string;
  chip: string;
};

type WeihnachtenStatus = {
  year: number;
  peopleCount: number;
  purchasedCount: number;
};

// Besitzt den Zustand der beiden Popups (Person/Idee anlegen) - ein
// gemeinsamer Client-Wrapper, weil sowohl die Buttons oben auf der Seite
// als auch die gestrichelte Kachel unten in PersonSearchList dasselbe
// "Person anlegen"-Popup oeffnen sollen. Struktur/Maße 1:1 aus der
// Referenz-Mockup-Datei (Uebersicht.dc.html).
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
  weihnachten: WeihnachtenStatus | null;
}) {
  const personDialogRef = useRef<HTMLDialogElement>(null);
  const giftDialogRef = useRef<HTMLDialogElement>(null);

  const openPersonModal = () => personDialogRef.current?.showModal();
  const openGiftModal = () => giftDialogRef.current?.showModal();

  const showAnlaesseCard = upcoming.length > 0 || (weihnachten && weihnachten.peopleCount > 0);
  const weihnachtenPct =
    weihnachten && weihnachten.peopleCount > 0
      ? Math.round((weihnachten.purchasedCount / weihnachten.peopleCount) * 100)
      : 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[34px] font-bold text-h1">Deine Übersicht</h1>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openPersonModal}
            className="h-11 cursor-pointer rounded-full border border-accent px-[22px] text-sm font-medium text-accent transition hover:opacity-85 active:scale-95"
          >
            + Person anlegen
          </button>
          {people.length > 0 && (
            <button
              type="button"
              onClick={openGiftModal}
              className="h-11 cursor-pointer rounded-full bg-btn-bg px-[22px] text-sm font-semibold text-btn-text transition hover:opacity-85 active:scale-95"
            >
              + Idee erfassen
            </button>
          )}
        </div>
      </div>

      {/* Zwei Spalten, die auf schmalen Bildschirmen untereinander
          umbrechen: Anlässe-Karte flex:1 1 320px/max-width 380px,
          Personenbereich flex:999 1 560px. */}
      <div className="flex flex-wrap items-start gap-6">
        {showAnlaesseCard && (
          <section
            aria-labelledby="anlaesse"
            className="flex min-w-0 flex-1 basis-[320px] flex-col gap-4 rounded-2xl bg-tile p-6 max-lg:max-w-full lg:max-w-[380px]"
          >
            <h2 id="anlaesse" className="text-xl font-bold text-heading">
              Nächste Anlässe
            </h2>

            {upcoming.length > 0 && (
              <div className="flex flex-col">
                {upcoming.map((entry) => (
                  <div
                    key={entry.key}
                    className="flex items-center gap-3 border-b border-rule py-3"
                  >
                    <span className="flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-[10px] border border-tag-border text-xs text-text">
                      <span className="text-sm font-bold">{entry.day}.</span>
                      <span>{monthAbbreviation(entry.month)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-text">
                        {entry.title}
                      </span>
                      <span className="block text-[13px] text-muted">{entry.subtitle}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-tag-border px-2.5 py-[3px] text-xs text-tag-text">
                      {entry.chip}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {weihnachten && weihnachten.peopleCount > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-[15px] font-semibold text-heading">
                  Weihnachten {weihnachten.year}
                </h3>
                <p className="text-sm text-text">
                  {weihnachten.purchasedCount} von {weihnachten.peopleCount}{" "}
                  {weihnachten.peopleCount === 1 ? "Person" : "Personen"} besorgt
                </p>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={weihnachten.peopleCount}
                  aria-valuenow={weihnachten.purchasedCount}
                  aria-label="Personen besorgt"
                  className="h-2 overflow-hidden rounded-full bg-track"
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${weihnachtenPct}%` }}
                  />
                </div>
                <a
                  href="#personen"
                  className="text-sm text-accent underline transition hover:opacity-85"
                >
                  Status je Person ansehen
                </a>
              </div>
            )}
          </section>
        )}

        <PersonSearchList people={personCards} onAddPerson={openPersonModal} />
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
