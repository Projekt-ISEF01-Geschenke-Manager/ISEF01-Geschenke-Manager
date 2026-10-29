"use client";

import { useTransition, useActionState } from "react";
import { setGiftStatus, deleteGift, type GiftStatus } from "@/app/actions/gifts";

export type Gift = {
  id: string;
  title: string;
  link: string | null;
  status: string;
  occasion_name: string | null;
};

export function GiftItem({ gift }: { gift: Gift }) {
  const [isPending, startTransition] = useTransition();
  const [deleteState, deleteAction] = useActionState(
    deleteGift.bind(null, gift.id),
    undefined,
  );
  const isPurchased = gift.status === "purchased";

  function toggleStatus() {
    const next: GiftStatus = isPurchased ? "idea" : "purchased";
    startTransition(() => {
      setGiftStatus(gift.id, next);
    });
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
