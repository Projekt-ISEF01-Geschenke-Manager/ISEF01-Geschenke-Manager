"use client";

import { useTransition, useActionState, useState, useRef } from "react";
import { ExternalLink, Circle, CheckCircle2, ChevronDown, Undo2 } from "lucide-react";
import {
  setGiftStatus,
  deleteGift,
  updateGift,
  type GiftStatus,
  type GiftFormState,
} from "@/app/actions/gifts";
import { shortLink } from "@/lib/url";
import { Modal } from "@/components/modal";

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
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteGift.bind(null, gift.id),
    undefined,
  );
  const [updateState, updateAction] = useActionState<GiftFormState, FormData>(
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
      <li className="surface reveal rounded-2xl p-4">
        <form action={updateAction} className="flex flex-col gap-2">
          <input
            type="text"
            name="title"
            required
            placeholder="Titel der Idee"
            defaultValue={updateState?.values?.title}
            className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-2.5 py-1.5 text-base sm:text-sm"
          />
          <input
            type="url"
            name="link"
            placeholder="https://…"
            defaultValue={updateState?.values?.link}
            className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-2.5 py-1.5 text-base sm:text-sm"
          />
          <div className="relative">
            <select
              name="occasionId"
              defaultValue={updateState?.values?.occasionId ?? ""}
              className="w-full appearance-none rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-2.5 py-1.5 pr-9 text-base sm:text-sm"
            >
              <option value="">Ohne Anlass</option>
              {occasions.map((occasion) => (
                <option key={occasion.id} value={occasion.id}>
                  {occasion.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
          {updateState?.error && (
            <p className="text-xs text-danger">
              {updateState.error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
              }}
              className="btn btn-secondary btn-sm"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="surface reveal rounded-2xl p-4">
      {/* Stapelt auf Mobile (Bild+Titel oben, Aktions-Buttons darunter) statt
          nebeneinander - bei fixer Breite der Buttons (shrink-0) ueberlagerte
          sich das sonst auf schmalen Bildschirmen mit dem Titel. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {/* Bild-Platzhalter - Bild-Upload folgt erst in Stufe 3 (#95). */}
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-[11px] text-muted">
            Bild
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{gift.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs">
                {gift.occasion_name ?? "ohne Anlass"}
              </span>
            </div>
            {gift.link && (
              <p className="mt-1.5 text-sm">
                <a
                  href={gift.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={gift.link}
                  className="inline-flex items-center gap-1 underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {shortLink(gift.link)}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
          {/* Status-Umschalter: gleiche Groesse/Form wie Bearbeiten und
              Loeschen. Offen = Rahmen-Button, der beim Hover den Haken
              zeigt (Vorschau auf "besorgt"); besorgt = gruen mit Haken. */}
          <button
            type="button"
            onClick={toggleStatus}
            disabled={isPending}
            aria-label={isPurchased ? "Besorgt" : undefined}
            title={isPurchased ? "Wieder auf offen setzen" : "Als besorgt markieren"}
            className={`group btn btn-sm ${isPurchased ? "btn-success" : "btn-secondary"}`}
          >
            {isPurchased ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 group-hover:hidden" />
                <Undo2 className="hidden h-3.5 w-3.5 shrink-0 group-hover:block" />
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5 shrink-0 group-hover:hidden" />
                <CheckCircle2 className="hidden h-3.5 w-3.5 shrink-0 group-hover:block" />
              </>
            )}
            {isPurchased ? "Besorgt" : "Als besorgt markieren"}
          </button>
          <button
              type="button"
              onClick={() => {
                setIsEditing(true);
              }}
              className="btn btn-secondary btn-sm"
            >
              Bearbeiten
            </button>
            {/* Sicherheitsabfrage als eigenes Popup (Modal-Komponente)
                statt des nativen window.confirm() - sah mit Browser-/OS-
                Chrome zu fremd im App-Design aus (Feedback: "nicht über
                Google so ein Popup"). */}
            <button
              type="button"
              onClick={() => deleteDialogRef.current?.showModal()}
              className="btn btn-danger-outline btn-sm"
            >
              Löschen
            </button>
        </div>
      </div>

      <Modal dialogRef={deleteDialogRef} title="Idee löschen">
        <p className="text-sm">„{gift.title}“ wirklich löschen?</p>
        {deleteState?.error && (
          <p className="mt-2 text-xs text-danger">
            {deleteState.error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => deleteDialogRef.current?.close()}
            className="btn btn-secondary btn-sm"
          >
            Abbrechen
          </button>
          <form action={deleteAction}>
            <button
              type="submit"
              disabled={isDeletePending}
              className="btn btn-danger btn-sm"
            >
              {isDeletePending ? "Wird gelöscht …" : "Löschen"}
            </button>
          </form>
        </div>
      </Modal>

      {/* Aufgaben-Platzhalter - Checkliste folgt erst in Stufe 3 (#94). */}
      <p className="mt-3 border-t border-dashed border-line pt-3 text-xs text-muted">
        Aufgaben folgen in einer späteren Ausbaustufe (#94).
      </p>
    </li>
  );
}
