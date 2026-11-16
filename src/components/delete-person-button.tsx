"use client";

import { useActionState } from "react";
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
  // mehr existiert). Die Weiterleitung passiert serverseitig in der
  // deletePerson-Action selbst (siehe dort) statt hier per router.push() -
  // sonst koennte die jetzt geloeschte Personenseite kurz neu rendern und
  // notFound() ausloesen, bevor die Weiterleitung greift (Issue #156).
  redirectTo?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    deletePerson.bind(null, personId, redirectTo),
    undefined,
  );

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
        disabled={isPending}
        className="cursor-pointer text-sm text-red-700 underline transition hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
      >
        {isPending ? "Wird gelöscht …" : "Löschen"}
      </button>
    </form>
  );
}
