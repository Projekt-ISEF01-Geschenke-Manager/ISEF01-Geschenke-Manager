"use client";

import { useTransition, useActionState, useState } from "react";
import {
  setGiftStatus,
  deleteGift,
  updateGift,
  type GiftStatus,
} from "@/app/actions/gifts";

export type Gift = {
  id: string;
  title: string;
  link: string | null;
  status: string;
  occasion_id: string | null;
  occasion_name: string | null;
};

type Occasion = { id: string; name: string };

export function GiftItem({
  gift,
  occasions,
}: {
  gift: Gift;
  occasions: Occasion[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteState, deleteAction] = useActionState(
    deleteGift.bind(null, gift.id),
    undefined,
  );
  const [updateState, updateAction] = useActionState(
    updateGift.bind(null, gift.id),
    {
      values: {
        personId: "",
        title: gift.title,
        link: gift.link ?? "",
        occasionId: gift.occasion_id ?? "",
      },
    },
  );
  const isPurchased = gift.status === "purchased";

  // Formular nach erfolgreichem Speichern wieder einklappen - zeigt dann
  // die aktualisierten Werte aus dem (neu geladenen) gift-Objekt an. Direkt
  // waehrend des Renders statt in einem Effect angepasst (React-Pattern
  // "Adjusting state when a prop changes"), weil set-state-in-effect sonst
  // unnoetig eine zusaetzliche Render-Kaskade ausloest.
  const [lastUpdateState, setLastUpdateState] = useState(updateState);
  if (updateState !== lastUpdateState) {
    setLastUpdateState(updateState);
    if (updateState?.success && isEditing) {
      setIsEditing(false);
    }
  }

  function toggleStatus() {
    const next: GiftStatus = isPurchased ? "idea" : "purchased";
    startTransition(() => {
      setGiftStatus(gift.id, next);
    });
  }

  if (isEditing) {
    return (
      <li className="py-2">
        <form action={updateAction} className="flex flex-col gap-2">
          <input
            type="text"
            name="title"
            required
            placeholder="Titel der Idee"
            defaultValue={updateState?.values?.title}
            className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm dark:border-neutral-600"
          />
          <input
            type="url"
            name="link"
            placeholder="https://…"
            defaultValue={updateState?.values?.link}
            className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm dark:border-neutral-600"
          />
          <select
            name="occasionId"
            defaultValue={updateState?.values?.occasionId ?? ""}
            className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm dark:border-neutral-600"
          >
            <option value="">Ohne Anlass</option>
            {occasions.map((occasion) => (
              <option key={occasion.id} value={occasion.id}>
                {occasion.name}
              </option>
            ))}
          </select>
          {updateState?.error && (
            <p className="text-xs text-red-700 dark:text-red-400">
              {updateState.error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              className="cursor-pointer rounded-full bg-btn-bg px-3 py-1 text-xs font-medium text-btn-text transition hover:opacity-90 active:scale-95"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="cursor-pointer text-xs text-neutral-600 underline dark:text-neutral-400"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm">{gift.title}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {gift.occasion_name ?? "Ohne Anlass"}
            {gift.link && (
              <>
                {" · "}
                <a
                  href={gift.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Link
                </a>
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleStatus}
            disabled={isPending}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition active:scale-95 ${
              isPurchased
                ? "border-green-600 text-green-700 dark:border-green-500 dark:text-green-400"
                : "border-neutral-300 text-neutral-600 dark:border-neutral-600 dark:text-neutral-400"
            }`}
          >
            {isPurchased ? "besorgt" : "offen"}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="cursor-pointer text-xs text-neutral-600 underline dark:text-neutral-400"
          >
            Bearbeiten
          </button>
          <form action={deleteAction}>
            <button
              type="submit"
              className="cursor-pointer text-xs text-red-700 underline transition hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              Löschen
            </button>
          </form>
        </div>
      </div>
      {deleteState?.error && (
        <p className="mt-1 text-xs text-red-700 dark:text-red-400">
          {deleteState.error}
        </p>
      )}
    </li>
  );
}
