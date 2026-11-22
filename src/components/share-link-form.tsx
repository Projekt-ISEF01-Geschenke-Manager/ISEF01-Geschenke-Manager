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
      .then(() => {
        setCopied(true);
      })
      .catch(() => {
        setCopied(false);
      });
  }

  if (state?.token) {
    const token = state.token;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">Dein Link:</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-subtle px-3 py-2 text-sm">
            /teilen/{token}
          </code>
          <button
            type="button"
            onClick={() => {
              copyLink(token);
            }}
            className="btn btn-secondary"
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
          className="w-fit cursor-pointer text-sm text-muted underline"
        >
          Weiteren Link erstellen
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {state?.error && (
        <p className="rounded-md border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger">
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
        className="btn btn-primary self-start"
      >
        Link erstellen
      </button>
    </form>
  );
}
