"use client";

import { deletePerson } from "@/app/actions/people";

export function DeletePersonButton({
  personId,
  personName,
}: {
  personId: string;
  personName: string;
}) {
  return (
    <form
      action={deletePerson.bind(null, personId)}
      onSubmit={(event) => {
        if (
          !confirm(
            `${personName} wirklich löschen? Damit werden auch alle Ideen und Geschenke dieser Person gelöscht.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="cursor-pointer text-sm text-red-700 underline transition hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
      >
        Löschen
      </button>
    </form>
  );
}
