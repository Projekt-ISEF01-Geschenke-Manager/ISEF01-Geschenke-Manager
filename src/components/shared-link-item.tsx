"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
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
    <li
      ref={removeRef}
      className="surface reveal flex flex-wrap items-center gap-4 rounded-2xl p-4"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-avatar text-text"
      >
        <Link2 className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-base font-semibold text-heading">
          {peopleNames.join(", ")}
        </p>
        <p className="text-xs text-muted">
          erstellt am{" "}
          {new Date(createdAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>
        {state?.error && (
          <p className="anim-in mt-1 text-xs text-danger">{state.error}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={copyLink}
          className={`btn btn-sm ${copied ? "btn-success" : "btn-secondary"}`}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0" />
          )}
          {copied ? "Kopiert" : "Link kopieren"}
        </button>
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
            className="btn btn-danger-outline btn-sm"
          >
            {isPending ? "Wird widerrufen …" : "Widerrufen"}
          </button>
        </form>
      </div>
    </li>
  );
}
