"use client";

import { useActionState, useEffect, useRef } from "react";
import { createGift, type GiftFormState } from "@/app/actions/gifts";

// Schnelleingabe (Z1, A8, Personenseite-Wireframe): nur der Titel - die
// Person steht schon fest. Link, Bild und Anlass ergaenzt man danach per
// Klick auf die Idee (GiftItem-Bearbeiten-Modus), nicht hier.
export function QuickAddGiftForm({ personId }: { personId: string }) {
  const [state, formAction, isPending] = useActionState<
    GiftFormState,
    FormData
  >(createGift, undefined);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      titleRef.current?.focus();
    }
  }, [state]);

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex gap-2">
        <input type="hidden" name="personId" value={personId} />
        <input
          ref={titleRef}
          type="text"
          name="title"
          required
          placeholder="Neue Idee, z. B. Gartenschere …"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-base dark:border-neutral-600 sm:text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 cursor-pointer rounded-full bg-btn-bg px-5 py-2 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "…" : "Speichern"}
        </button>
      </form>
      {state?.error ? (
        <p className="mt-1 text-xs text-red-700 dark:text-red-400">
          {state.error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Link, Bild und Anlass ergänzt du danach – oder über „+ Idee
          erfassen“.
        </p>
      )}
    </div>
  );
}
