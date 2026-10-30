"use client";

import { useActionState, useRef, useState } from "react";
import { createSharedLink } from "@/app/actions/shared-links";

type Person = { id: string; name: string };

export function ShareLinkForm({
  people,
  preselectedPersonId,
}: {
  people: Person[];
  preselectedPersonId?: string;
}) {
  const [state, formAction] = useActionState(createSharedLink, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [copied, setCopied] = useState(false);

  function copyLink(token: string) {
    const url = `${window.location.origin}/teilen/${token}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }

  if (state?.token) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">Dein Link:</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800">
            /teilen/{state.token}
          </code>
          <button
            type="button"
            onClick={() => copyLink(state.token!)}
            className="cursor-pointer rounded-full border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            {copied ? "Kopiert ✓" : "Kopieren"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            formRef.current?.reset();
            setCopied(false);
            // state.token bleibt sonst stehen (useActionState kennt kein
            // "zurueck zum Formular") - einfachster Weg: Seite neu anfragen.
            window.location.reload();
          }}
          className="w-fit cursor-pointer text-sm text-neutral-600 underline dark:text-neutral-400"
        >
          Weiteren Link erstellen
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      <p className="text-sm">Welche Personen soll der Link zeigen?</p>
      <div className="flex flex-col gap-2">
        {people.map((person) => (
          <label key={person.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="personId"
              value={person.id}
              defaultChecked={person.id === preselectedPersonId}
            />
            {person.name}
          </label>
        ))}
      </div>
      <button
        type="submit"
        className="cursor-pointer self-start rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 active:scale-95 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Link erstellen
      </button>
    </form>
  );
}
