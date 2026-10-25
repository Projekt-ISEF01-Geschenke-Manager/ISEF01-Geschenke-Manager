"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = undefined;

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-xl font-semibold">Anmelden</h2>

      {state?.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          E-Mail
          <input
            type="email"
            name="email"
            required
            defaultValue={state?.email}
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Passwort
          <input
            type="password"
            name="password"
            required
            className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600"
          />
        </label>

        <div className="flex items-center justify-between gap-4">
          <Link href="/passwort-vergessen" className="text-sm underline">
            Passwort vergessen?
          </Link>
          <button
            type="submit"
            className="cursor-pointer transition active:scale-95 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Anmelden
          </button>
        </div>
      </form>

      <p className="mt-4 border-t border-neutral-200 pt-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
        Noch kein Konto?{" "}
        <Link href="/register" className="underline">
          Jetzt registrieren
        </Link>
      </p>
    </div>
  );
}
