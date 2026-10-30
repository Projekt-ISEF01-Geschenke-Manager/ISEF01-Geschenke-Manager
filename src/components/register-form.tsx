"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type RegisterState } from "@/app/actions/auth";

const initialState: RegisterState = undefined;

export function RegisterForm() {
  const [state, formAction] = useActionState(signup, initialState);

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="text-xl font-semibold text-heading">Konto erstellen</h2>
      <p className="mt-1 text-sm text-muted">
        Mit * markierte Felder sind Pflichtfelder.
      </p>

      {state?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-text">
          Vorname *
          <input
            type="text"
            name="name"
            required
            placeholder="Dein Vorname"
            defaultValue={state?.values?.name}
            className="h-11 rounded-lg border border-input-border bg-input-bg px-3 focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text">
          E-Mail *
          <input
            type="email"
            name="email"
            required
            placeholder="name@beispiel.de"
            defaultValue={state?.values?.email}
            className="h-11 rounded-lg border border-input-border bg-input-bg px-3 focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text">
          Passwort *
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="h-11 rounded-lg border border-input-border bg-input-bg px-3 focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none"
          />
          <span className="text-xs text-muted">Mindestens 8 Zeichen</span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text">
          Passwort wiederholen *
          <input
            type="password"
            name="passwordRepeat"
            required
            minLength={8}
            className="h-11 rounded-lg border border-input-border bg-input-bg px-3 focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none"
          />
        </label>

        <label className="flex items-start gap-2 text-sm text-text">
          <input type="checkbox" name="privacyAccepted" required className="mt-1" />
          <span>
            Ich habe die{" "}
            <Link
              href="/datenschutz"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Datenschutzerklärung
            </Link>{" "}
            gelesen. *
          </span>
        </label>

        <button
          type="submit"
          className="h-11 cursor-pointer rounded-full bg-btn-bg px-5 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95"
        >
          Konto erstellen
        </button>
      </form>

      <p className="mt-4 border-t border-rule pt-4 text-center text-sm text-muted">
        Bereits registriert?{" "}
        <Link href="/" className="text-accent underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
