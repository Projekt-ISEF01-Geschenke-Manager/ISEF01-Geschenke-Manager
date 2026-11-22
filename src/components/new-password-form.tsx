"use client";

import { useActionState } from "react";
import Link from "next/link";
import { setNewPassword, type NewPasswordState } from "@/app/actions/auth";

const initialState: NewPasswordState = undefined;

export function NewPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    setNewPassword,
    initialState,
  );

  if (state?.success) {
    return (
      <div className="surface rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-heading">
          Passwort geändert
        </h2>
        <p className="mt-3 rounded-lg border border-success-line bg-success-bg px-3 py-2 text-sm text-success">
          Dein Passwort wurde erfolgreich geändert.
        </p>
        <Link
          href="/dashboard"
          className="btn btn-primary mt-4"
        >
          Weiter zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-heading">
        Neues Passwort festlegen
      </h2>

      {state?.error && (
        <p className="mt-3 rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-text">
          Neues Passwort
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="h-11 rounded-lg border border-input-border bg-input-bg px-3 text-base focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none sm:text-sm"
          />
          <span className="text-xs text-muted">Mindestens 8 Zeichen</span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text">
          Neues Passwort wiederholen
          <input
            type="password"
            name="passwordRepeat"
            required
            minLength={8}
            className="h-11 rounded-lg border border-input-border bg-input-bg px-3 text-base focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none sm:text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary self-start"
        >
          {isPending ? "Wird gespeichert …" : "Passwort speichern"}
        </button>
      </form>
    </div>
  );
}
