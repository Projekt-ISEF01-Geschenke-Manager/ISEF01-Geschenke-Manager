"use client";

import { useActionState, useState } from "react";
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
  const [state, formAction] = useActionState(
    deleteSharedLink.bind(null, linkId),
    undefined,
  );
  const [copied, setCopied] = useState(false);

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
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div>
        <p className="font-medium">{peopleNames.join(", ")}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
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
          <p className="mt-1 text-xs text-red-700 dark:text-red-400">
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
          }
        }}
      >
        <button
          type="submit"
          className="cursor-pointer text-sm text-red-700 underline transition hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
        >
          Widerrufen
        </button>
      </form>
    </li>
  );
}
