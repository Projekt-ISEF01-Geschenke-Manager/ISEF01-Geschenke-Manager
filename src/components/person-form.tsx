"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createPerson,
  updatePerson,
  type PersonFormState,
} from "@/app/actions/people";

export type EditablePerson = {
  id: string;
  name: string;
  birthday_day: number | null;
  birthday_month: number | null;
  birthday_year: number | null;
  interests: string[];
  notes: string | null;
};

export function PersonForm({
  person,
  onSuccess,
}: {
  person?: EditablePerson;
  // Nur im Popup auf der Übersicht gesetzt - schließt das Popup und zeigt
  // eine Bestätigung (siehe DashboardOverview). Auf der Personenseite
  // (Bearbeiten-Formular) bleibt das Formular wie bisher offen stehen.
  onSuccess?: () => void;
}) {
  const action = person ? updatePerson.bind(null, person.id) : createPerson;
  const initialState: PersonFormState = person
    ? {
        values: {
          name: person.name,
          birthdayDay: person.birthday_day?.toString() ?? "",
          birthdayMonth: person.birthday_month?.toString() ?? "",
          birthdayYear: person.birthday_year?.toString() ?? "",
          interests: person.interests.join(", "),
          notes: person.notes ?? "",
        },
      }
    : undefined;
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Ref statt onSuccess direkt in den Dependencies: DashboardOverview
  // uebergibt bei jedem Render eine neue Funktionsreferenz, die Ref bleibt
  // aber ueber Renders hinweg dieselbe - der Effekt soll ausschliesslich an
  // echte state-Wechsel (Formular-Submit) gekoppelt sein, nicht an
  // Re-Renders des Elternteils.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (state?.success) {
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

      <form action={formAction} className="form-stagger flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Name *
          <input
            type="text"
            name="name"
            required
            placeholder="z. B. Oma Erna"
            defaultValue={state?.values?.name}
            className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 text-base sm:text-sm"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <span>Geburtstag (Jahr optional)</span>
          <div className="flex gap-2">
            <input
              type="number"
              name="birthdayDay"
              min={1}
              max={31}
              placeholder="Tag"
              defaultValue={state?.values?.birthdayDay}
              className="w-20 rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 text-base sm:text-sm"
            />
            <input
              type="number"
              name="birthdayMonth"
              min={1}
              max={12}
              placeholder="Monat"
              defaultValue={state?.values?.birthdayMonth}
              className="w-24 rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 text-base sm:text-sm"
            />
            <input
              type="number"
              name="birthdayYear"
              min={1900}
              max={2100}
              placeholder="Jahr (optional)"
              defaultValue={state?.values?.birthdayYear}
              className="flex-1 rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 text-base sm:text-sm"
            />
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Interessen
          <input
            type="text"
            name="interests"
            placeholder="z. B. Garten, Kochen"
            defaultValue={state?.values?.interests}
            className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 text-base sm:text-sm"
          />
          <span className="text-xs text-muted">
            Mit Komma getrennt
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Notiz
          <textarea
            name="notes"
            rows={2}
            defaultValue={state?.values?.notes}
            className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 py-2 text-base sm:text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary self-start"
        >
          {isPending ? "Wird gespeichert …" : person ? "Speichern" : "Person anlegen"}
        </button>
      </form>
    </div>
  );
}
