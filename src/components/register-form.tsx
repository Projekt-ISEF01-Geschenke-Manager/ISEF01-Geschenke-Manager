"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type RegisterState } from "@/app/actions/auth";

const initialState: RegisterState = undefined;

export function RegisterForm() {
  const [state, formAction] = useActionState(signup, initialState);

  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-xl font-semibold">Konto erstellen</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Mit * markierte Felder sind Pflichtfelder.
      </p>

      {state?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Vorname *
          <input
            type="text"
            name="name"
            required
            placeholder="Dein Vorname"
            defaultValue={state?.values?.name}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          E-Mail *
          <input
            type="email"
            name="email"
            required
            placeholder="name@beispiel.de"
            defaultValue={state?.values?.email}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Passwort *
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Mindestens 8 Zeichen
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Passwort wiederholen *
          <input
            type="password"
            name="passwordRepeat"
            required
            minLength={8}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
        </label>

        <label className="flex items-start gap-2 text-sm">
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
          className="cursor-pointer transition active:scale-95 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Konto erstellen
        </button>
      </form>

      <p className="mt-4 border-t border-neutral-200 pt-4 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
        Bereits registriert?{" "}
        <Link href="/" className="underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
