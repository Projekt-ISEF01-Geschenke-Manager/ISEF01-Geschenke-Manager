"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = undefined;

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-heading">Anmelden</h2>

      {state?.error && (
        <p className="mt-3 rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-text">
          E-Mail
          <input
            type="email"
            name="email"
            required
            defaultValue={state?.email}
            className="h-11 rounded-lg border border-input-border bg-input-bg px-3 text-base focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none sm:text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text">
          Passwort
          <input
            type="password"
            name="password"
            required
            className="h-11 rounded-lg border border-input-border bg-input-bg px-3 text-base focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none sm:text-sm"
          />
        </label>

        <div className="flex items-center justify-between gap-4">
          <Link href="/passwort-vergessen" className="text-sm text-accent underline">
            Passwort vergessen?
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
          >
            Anmelden
          </button>
        </div>
      </form>

      <p className="mt-4 border-t border-rule pt-4 text-sm text-muted">
        Noch kein Konto?{" "}
        <Link href="/register" className="text-accent underline">
          Jetzt registrieren
        </Link>
      </p>
    </div>
  );
}
