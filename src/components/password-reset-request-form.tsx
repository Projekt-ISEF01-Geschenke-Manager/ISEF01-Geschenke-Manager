"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordReset,
  type PasswordResetState,
} from "@/app/actions/auth";

const initialState: PasswordResetState = undefined;

export function PasswordResetRequestForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="text-xl font-semibold text-heading">Passwort vergessen</h2>
      <p className="mt-1 text-sm text-muted">
        Gib deine E-Mail-Adresse ein, wir schicken dir dann einen Link zum
        Zurücksetzen.
      </p>

      {state?.message ? (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          {state.message}
        </p>
      ) : (
        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-text">
            E-Mail
            <input
              type="email"
              name="email"
              required
              className="h-11 rounded-lg border border-input-border bg-input-bg px-3 text-base focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none sm:text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="h-11 cursor-pointer self-start rounded-full bg-btn-bg px-5 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Wird gesendet …" : "Link anfordern"}
          </button>
        </form>
      )}

      <p className="mt-4 border-t border-rule pt-4 text-sm text-muted">
        <Link href="/" className="text-accent underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </div>
  );
}
