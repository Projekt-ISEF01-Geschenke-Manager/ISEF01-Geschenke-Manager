"use client";

import { useActionState, useEffect } from "react";
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
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state?.success) {
      onSuccess?.();
    }
    // onSuccess bewusst nicht in den Dependencies - DashboardOverview
    // uebergibt bei jedem Render eine neue Funktionsreferenz; der Effekt
    // soll ausschliesslich an echte state-Wechsel (Formular-Submit)
    // gekoppelt sein, nicht an Re-Renders des Elternteils.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div>
      {state?.error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Name *
          <input
            type="text"
            name="name"
            required
            placeholder="z. B. Oma Erna"
            defaultValue={state?.values?.name}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
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
              className="w-20 rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
            />
            <input
              type="number"
              name="birthdayMonth"
              min={1}
              max={12}
              placeholder="Monat"
              defaultValue={state?.values?.birthdayMonth}
              className="w-24 rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
            />
            <input
              type="number"
              name="birthdayYear"
              min={1900}
              max={2100}
              placeholder="Jahr (optional)"
              defaultValue={state?.values?.birthdayYear}
              className="flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
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
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Mit Komma getrennt
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Notiz
          <textarea
            name="notes"
            rows={2}
            defaultValue={state?.values?.notes}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
        </label>

        <button
          type="submit"
          className="cursor-pointer self-start rounded-full bg-btn-bg px-5 py-2.5 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95"
        >
          {person ? "Speichern" : "Person anlegen"}
        </button>
      </form>
    </div>
  );
}
