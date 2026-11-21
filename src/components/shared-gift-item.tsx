"use client";

import { useActionState } from "react";
import { ExternalLink, Circle, CheckCircle2 } from "lucide-react";
import { isValidHttpUrl } from "@/lib/url";
import type { GiftStatus } from "@/lib/gift-status";
import {
  toggleGiftStatusViaSharedLink,
  type SharedGiftStatusState,
} from "@/app/actions/shared-gifts";

export type SharedGift = {
  id: string;
  title: string;
  link: string | null;
  status: string;
  occasion_name: string | null;
};

// Rein lesend bis auf den Status (A10) - kein Bearbeiten/Löschen, aber
// besorgt/offen umschaltbar (Feedback: "sonst weiß niemand was schon
// besorgt wurde"), ueber die oeffentliche toggleGiftStatusViaSharedLink-
// Aktion statt der eingeloggten setGiftStatus. Kartenlayout und
// Status-Button-Optik analog zu GiftItem (Personenseite), damit beide
// Ansichten optisch zusammenpassen (geteilte-ansicht.html).
export function SharedGiftItem({
  gift,
  token,
}: {
  gift: SharedGift;
  token: string;
}) {
  const isPurchased = gift.status === "purchased";
  const nextStatus: GiftStatus = isPurchased ? "idea" : "purchased";
  const [state, toggleAction, isPending] = useActionState<
    SharedGiftStatusState,
    FormData
  >(
    toggleGiftStatusViaSharedLink.bind(null, token, gift.id, nextStatus),
    undefined,
  );
  // Wird zwar schon beim Speichern geprueft (createGift), hier zusaetzlich
  // nochmal validiert, bevor der Wert als <a href> gerendert wird (defense
  // in depth, Codacy-Review-Hinweis).
  const safeLink = gift.link && isValidHttpUrl(gift.link) ? gift.link : null;

  return (
    <li className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
      <div className="flex items-start gap-3">
        {/* Bild-Platzhalter - Bild-Upload folgt erst in Stufe 3 (#95), wie
            bei GiftItem auf der Personenseite. */}
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-[11px] text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
          Bild
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold">{gift.title}</p>
            <form action={toggleAction}>
              <button
                type="submit"
                disabled={isPending}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition active:scale-95 ${
                  isPurchased
                    ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-500 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900"
                    : "border-neutral-400 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                }`}
              >
                {isPurchased ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0" />
                )}
                {isPurchased ? "besorgt" : "offen"}
              </button>
            </form>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs dark:border-neutral-600">
              {gift.occasion_name ?? "ohne Anlass"}
            </span>
          </div>
          {safeLink && (
            <p className="mt-1.5 text-sm">
              <a
                href={safeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                Zum Angebot ↗
              </a>
            </p>
          )}
          {state?.error && (
            <p className="mt-1.5 text-xs text-red-700 dark:text-red-400">
              {state.error}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
