"use client";

import { useActionState, useEffect, useState } from "react";
import { useRemoveAnimation } from "@/lib/use-remove-animation";
import { deleteSharedLink } from "@/app/actions/shared-links";

export function SharedLinkItem({
  linkId,
  token,
  peopleNames,
  createdAt,
}: {
  linkId: string;
  token: string;
  peopleNames: string[];
  createdAt: string;
}) {
  const [state, formAction, isPending] = useActionState(
    deleteSharedLink.bind(null, linkId),
    undefined,
  );
  const [copied, setCopied] = useState(false);
  const [removeRef, startRemove, cancelRemove] = useRemoveAnimation<HTMLLIElement>();

  // Schlaegt das Widerrufen fehl, kommt der Eintrag wieder zurueck.
  const error = state?.error;
  useEffect(() => {
    if (error) cancelRemove();
  }, [error, cancelRemove]);

  function copyLink() {
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

  return (
    <li ref={removeRef} className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div>
        <p className="font-medium">{peopleNames.join(", ")}</p>
        <p className="text-sm text-muted">
          erstellt am{" "}
          {new Date(createdAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}{" "}
          ·{" "}
          <button
            type="button"
            onClick={copyLink}
            className="cursor-pointer underline"
          >
            {copied ? "Kopiert ✓" : "Link kopieren"}
          </button>
        </p>
        {state?.error && (
          <p className="mt-1 text-xs text-danger">
            {state.error}
          </p>
        )}
      </div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            !confirm(
              "Diesen Link wirklich widerrufen? Er funktioniert danach nicht mehr.",
            )
          ) {
            event.preventDefault();
            return;
          }
          startRemove();
        }}
      >
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer text-sm text-danger underline transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Wird widerrufen …" : "Widerrufen"}
        </button>
      </form>
    </li>
  );
}
