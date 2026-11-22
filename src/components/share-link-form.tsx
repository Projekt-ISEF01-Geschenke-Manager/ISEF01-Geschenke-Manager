"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
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
      <div className="anim-in flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <Check className="h-4 w-4" />
          Link erstellt
        </p>
        <code className="block overflow-x-auto rounded-lg bg-subtle px-3 py-2 text-sm">
          /teilen/{token}
        </code>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              copyLink(token);
            }}
            className={`btn btn-sm ${copied ? "btn-success" : "btn-primary"}`}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0" />
            )}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
          <button
            type="button"
            onClick={() => {
              formRef.current?.reset();
              setCopied(false);
              // state.token bleibt sonst stehen (useActionState kennt kein
              // "zurueck zum Formular") - einfachster Weg: Seite neu anfragen.
              window.location.reload();
            }}
            className="btn btn-secondary btn-sm"
          >
            Weiteren Link erstellen
          </button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-md border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <p className="text-sm text-muted">Welche Personen soll der Link zeigen?</p>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => (
          <label key={person.id} className="cursor-pointer">
            <input
              type="checkbox"
              name="personId"
              value={person.id}
              defaultChecked={person.id === preselectedPersonId}
              className="peer sr-only"
            />
            <span className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm transition duration-150 hover:bg-hover peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-checked:text-accent peer-checked:[&>svg]:block peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring">
              <Check className="hidden h-3.5 w-3.5" />
              {person.name}
            </span>
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
