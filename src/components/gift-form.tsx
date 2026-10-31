"use client";

import { useActionState, useRef, useEffect } from "react";
import { createGift, type GiftFormState } from "@/app/actions/gifts";

type Option = { id: string; name: string };

export function GiftForm({
  people,
  occasions,
  defaultPersonId,
  lockedPersonName,
}: {
  // Entweder people (Dropdown zum Auswaehlen, Uebersicht) oder
  // lockedPersonName + defaultPersonId (Person steht schon fest,
  // Personenseite - A8: "Nur der Titel, die Person steht schon fest").
  people?: Option[];
  occasions: Option[];
  defaultPersonId?: string;
  lockedPersonName?: string;
}) {
  const [state, formAction] = useActionState<GiftFormState, FormData>(
    createGift,
    undefined,
  );
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Nach erfolgreichem Speichern wird das Formular geleert (Titel/Link),
  // Fokus geht zurueck aufs Titel-Feld - mehrere Ideen hintereinander
  // erfassen (A8). state.success ist vom Ausgangszustand (undefined)
  // unterscheidbar, anders als ein blosses "kein Fehler".
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      titleRef.current?.focus();
    }
  }, [state]);

  return (
    <div>
      {state?.error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        {lockedPersonName ? (
          <input type="hidden" name="personId" value={defaultPersonId} />
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            Für wen? *
            <select
              name="personId"
              required
              defaultValue={state?.values?.personId ?? defaultPersonId ?? ""}
              className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
            >
              <option value="" disabled>
                Person auswählen
              </option>
              {people?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Idee *
          <input
            ref={titleRef}
            type="text"
            name="title"
            required
            autoFocus={!!lockedPersonName}
            placeholder="z. B. Kräutergarten-Set"
            defaultValue={state?.values?.title}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Link
          <input
            type="url"
            name="link"
            placeholder="https://…"
            defaultValue={state?.values?.link}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Anlass
          <select
            name="occasionId"
            defaultValue={state?.values?.occasionId ?? ""}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          >
            <option value="">Ohne Anlass</option>
            {occasions.map((occasion) => (
              <option key={occasion.id} value={occasion.id}>
                {occasion.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="cursor-pointer self-start rounded-full bg-btn-bg px-5 py-2.5 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95"
        >
          Idee speichern
        </button>
      </form>
    </div>
  );
}
