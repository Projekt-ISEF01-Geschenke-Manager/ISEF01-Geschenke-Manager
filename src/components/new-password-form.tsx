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
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <h2 className="text-xl font-semibold text-heading">
          Passwort geändert
        </h2>
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          Dein Passwort wurde erfolgreich geändert.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block h-11 cursor-pointer rounded-full bg-btn-bg px-5 py-2.5 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95"
        >
          Weiter zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="text-xl font-semibold text-heading">
        Neues Passwort festlegen
      </h2>

      {state?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
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
          className="h-11 cursor-pointer self-start rounded-full bg-btn-bg px-5 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Wird gespeichert …" : "Passwort speichern"}
        </button>
      </form>
    </div>
  );
}
