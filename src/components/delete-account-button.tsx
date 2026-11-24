"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/app/actions/admin";

export function DeleteAccountButton({
  accountId,
  email,
}: {
  accountId: string;
  email: string;
}) {
  const [state, formAction, isPending] = useActionState(
    deleteAccount.bind(null, accountId),
    undefined,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !confirm(
            `Konto ${email} wirklich unwiderruflich löschen? Damit werden auch alle Personen, Ideen und Geschenke dieses Kontos gelöscht.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {state?.error && <p className="mb-1 text-xs text-danger">{state.error}</p>}
      <button type="submit" disabled={isPending} className="btn btn-danger-outline btn-sm">
        {isPending ? "Wird gelöscht …" : "Löschen"}
      </button>
    </form>
  );
}
