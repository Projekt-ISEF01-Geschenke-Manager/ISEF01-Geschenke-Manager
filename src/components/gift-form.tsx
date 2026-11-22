"use client";

import { useActionState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { createGift, type GiftFormState } from "@/app/actions/gifts";

type Option = { id: string; name: string };

export function GiftForm({
  people,
  occasions,
  defaultPersonId,
  lockedPersonName,
  onSuccess,
}: {
  // Entweder people (Dropdown zum Auswaehlen, Uebersicht) oder
  // lockedPersonName + defaultPersonId (Person steht schon fest,
  // Personenseite - A8: "Nur der Titel, die Person steht schon fest").
  people?: Option[];
  occasions: Option[];
  defaultPersonId?: string;
  lockedPersonName?: string;
  // Nur im Popup auf der Übersicht gesetzt - schließt das Popup und zeigt
  // eine Bestätigung (siehe DashboardOverview). Auf der Personenseite
  // bleibt das Formular wie bisher offen, um mehrere Ideen hintereinander
  // zu erfassen (A8).
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    GiftFormState,
    FormData
  >(createGift, undefined);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Ref statt onSuccess direkt in den Dependencies, siehe person-form.tsx.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  // Nach erfolgreichem Speichern wird das Formular geleert (Titel/Link),
  // Fokus geht zurueck aufs Titel-Feld - mehrere Ideen hintereinander
  // erfassen (A8). state.success ist vom Ausgangszustand (undefined)
  // unterscheidbar, anders als ein blosses "kein Fehler".
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      titleRef.current?.focus();
      onSuccessRef.current?.();
    }
  }, [state]);

  return (
    <div>
      {state?.error && (
        <p className="anim-in mb-3 rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <form ref={formRef} action={formAction} className="form-stagger flex flex-col gap-3">
        {lockedPersonName ? (
          <input type="hidden" name="personId" value={defaultPersonId} />
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            Für wen? *
            <div className="relative">
              <select
                name="personId"
                required
                defaultValue={state?.values?.personId ?? defaultPersonId ?? ""}
                className="w-full appearance-none rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 pr-9 text-base sm:text-sm"
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
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
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
            className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 text-base sm:text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Link
          <input
            type="url"
            name="link"
            placeholder="https://…"
            defaultValue={state?.values?.link}
            className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 text-base sm:text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Anlass
          <div className="relative">
            <select
              name="occasionId"
              defaultValue={state?.values?.occasionId ?? ""}
              className="w-full appearance-none rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 pr-9 text-base sm:text-sm"
            >
              <option value="">Ohne Anlass</option>
              {occasions.map((occasion) => (
                <option key={occasion.id} value={occasion.id}>
                  {occasion.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary self-start"
        >
          {isPending ? "Wird gespeichert …" : "Idee speichern"}
        </button>
      </form>
    </div>
  );
}
