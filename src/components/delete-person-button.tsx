"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deletePerson } from "@/app/actions/people";

export function DeletePersonButton({
  personId,
  personName,
  redirectTo,
}: {
  personId: string;
  personName: string;
  // Falls gesetzt: nach erfolgreichem Loeschen dorthin wechseln (z. B. von
  // der Personenseite zurueck zur Uebersicht, da die Person dort nicht
  // mehr existiert).
  redirectTo?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    deletePerson.bind(null, personId),
    undefined,
  );

  useEffect(() => {
    if (state?.success && redirectTo) {
      router.push(redirectTo);
    }
  }, [state, redirectTo, router]);

  return (
    <form
      action={formAction}
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
      {state?.error && (
        <p className="mb-1 text-xs text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        className="cursor-pointer text-sm text-red-700 underline transition hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
      >
        Löschen
      </button>
    </form>
  );
}
