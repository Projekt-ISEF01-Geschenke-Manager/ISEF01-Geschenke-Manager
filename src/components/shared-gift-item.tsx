"use client";

import { useActionState, useEffect, useRef } from "react";
import { Circle, CheckCircle2, Undo2 } from "lucide-react";
import { useStatusAnimation } from "@/lib/use-status-animation";
import { GiftLink } from "@/components/gift-link";
import { isValidHttpUrl } from "@/lib/url";
import type { GiftStatus } from "@/lib/gift-status";
import { Modal } from "@/components/modal";
import {
  toggleGiftStatusViaSharedLink,
  type SharedGiftStatusState,
} from "@/app/actions/shared-gifts";

export type SharedGift = {
  id: string;
  title: string;
  link: string | null;
  image_url: string | null;
  link_preview_url: string | null;
  status: string;
  purchased_by: string | null;
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
  const statusAnimation = useStatusAnimation(isPurchased);
  const nextStatus: GiftStatus = isPurchased ? "idea" : "purchased";
  const [state, toggleAction, isPending] = useActionState<
    SharedGiftStatusState,
    FormData
  >(
    toggleGiftStatusViaSharedLink.bind(null, token, gift.id, nextStatus),
    undefined,
  );
  // Name nur beim Markieren ALS besorgt abfragen (Popup) - beim
  // Zuruecksetzen auf "offen" macht eine Namensabfrage keinen Sinn, dort
  // wird direkt umgeschaltet.
  const nameDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (state?.success) {
      nameDialogRef.current?.close();
    }
  }, [state]);

  // Wird zwar schon beim Speichern geprueft (createGift), hier zusaetzlich
  // nochmal validiert, bevor der Wert als <a href> gerendert wird (defense
  // in depth, Codacy-Review-Hinweis).
  const safeLink = gift.link && isValidHttpUrl(gift.link) ? gift.link : null;

  return (
    <li className="surface reveal rounded-2xl p-4">
      <div className="flex items-start gap-3">
        {gift.image_url ?? gift.link_preview_url ? (
          <img
            src={gift.image_url ?? gift.link_preview_url ?? undefined}
            alt={gift.title}
            className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-[11px] text-muted">
            Bild
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold">{gift.title}</p>
            {isPurchased ? (
              <form action={toggleAction}>
                <button
                  type="submit"
                  disabled={isPending}
                  aria-label="Besorgt"
                  title="Wieder auf offen setzen"
                  className={`group btn btn-sm btn-success ${statusAnimation.className}`}
                  onAnimationEnd={statusAnimation.onAnimationEnd}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 group-hover:hidden" />
                  <Undo2 className="hidden h-3.5 w-3.5 shrink-0 group-hover:block" />
                  Besorgt
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => nameDialogRef.current?.showModal()}
                title="Als besorgt markieren"
                className={`group btn btn-sm btn-secondary ${statusAnimation.className}`}
                onAnimationEnd={statusAnimation.onAnimationEnd}
              >
                <Circle className="h-3.5 w-3.5 shrink-0 group-hover:hidden" />
                <CheckCircle2 className="hidden h-3.5 w-3.5 shrink-0 group-hover:block" />
                Als besorgt markieren
              </button>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs">
              {gift.occasion_name ?? "ohne Anlass"}
            </span>
          </div>
          {isPurchased && gift.purchased_by && (
            <p className="mt-1.5 text-xs text-muted">
              {gift.purchased_by} hat das schon besorgt.
            </p>
          )}
          {safeLink && (
            <div className="mt-2">
              <GiftLink href={safeLink} label="Zum Angebot" />
            </div>
          )}
          {!isPurchased && state?.error && (
            <p className="mt-1.5 text-xs text-danger">
              {state.error}
            </p>
          )}
        </div>
      </div>

      <Modal dialogRef={nameDialogRef} title="Als besorgt markieren">
        <form action={toggleAction}>
          <label className="flex flex-col gap-1 text-sm">
            Dein Name (optional)
            <input
              type="text"
              name="purchasedBy"
              placeholder="z. B. Max"
              maxLength={80}
              className="h-11 rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 text-base sm:text-sm"
            />
          </label>
          <p className="mt-1 text-xs text-muted">
            Damit andere sehen, wer „{gift.title}“ schon besorgt hat.
          </p>
          {state?.error && (
            <p className="mt-2 text-xs text-danger">
              {state.error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => nameDialogRef.current?.close()}
              className="btn btn-secondary btn-sm"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-sm"
            >
              {isPending ? "…" : "Als besorgt markieren"}
            </button>
          </div>
        </form>
      </Modal>
    </li>
  );
}
