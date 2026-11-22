"use client";

import { useTransition, useActionState, useState, useRef, useEffect } from "react";
import { ExternalLink, Circle, CheckCircle2, ChevronDown } from "lucide-react";
import {
  setGiftStatus,
  deleteGift,
  updateGift,
  convertGiftToGiven,
  type GiftStatus,
  type GiftFormState,
  type ConvertGiftState,
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
  const convertDialogRef = useRef<HTMLDialogElement>(null);
  const [convertState, convertAction, isConvertPending] = useActionState<
    ConvertGiftState,
    FormData
  >(convertGiftToGiven.bind(null, gift.id), undefined);

  useEffect(() => {
    if (convertState?.success) {
      convertDialogRef.current?.close();
    }
  }, [convertState]);
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
      <li className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
        <form action={updateAction} className="flex flex-col gap-2">
          <input
            type="text"
            name="title"
            required
            placeholder="Titel der Idee"
            defaultValue={updateState?.values?.title}
            className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
          />
          <input
            type="url"
            name="link"
            placeholder="https://…"
            defaultValue={updateState?.values?.link}
            className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
          />
          <div className="relative">
            <select
              name="occasionId"
              defaultValue={updateState?.values?.occasionId ?? ""}
              className="w-full appearance-none rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 pr-9 text-base dark:border-neutral-600 sm:text-sm"
            >
              <option value="">Ohne Anlass</option>
              {occasions.map((occasion) => (
                <option key={occasion.id} value={occasion.id}>
                  {occasion.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>
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
              onClick={() => {
                setIsEditing(false);
              }}
              className="cursor-pointer rounded-full border border-neutral-300 px-3 py-1 text-xs transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
      {/* Stapelt auf Mobile (Bild+Titel oben, Aktions-Buttons darunter) statt
          nebeneinander - bei fixer Breite der Buttons (shrink-0) ueberlagerte
          sich das sonst auf schmalen Bildschirmen mit dem Titel. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {/* Bild-Platzhalter - Bild-Upload folgt erst in Stufe 3 (#95). */}
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-[11px] text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
            Bild
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{gift.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs dark:border-neutral-600">
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

        <div className="flex flex-col items-start gap-2 sm:shrink-0 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {/* Eigener Button-Look (gefuellter Hintergrund + Icon), jetzt bei
                den uebrigen Aktions-Buttons rechts statt bei den reinen
                Info-Chips (Anlass) links - sonst wirkt der Status wie ein
                Label statt wie eine klickbare Umschaltung (Feedback:
                "sieht man nicht, dass es ein Button ist"). */}
            <button
              type="button"
              onClick={toggleStatus}
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
            {/* "Idee in Geschenk umwandeln" (#26) - Anlass/Datum-Dialog statt
                des bisherigen deaktivierten Platzhalters. */}
            <button
              type="button"
              onClick={() => convertDialogRef.current?.showModal()}
              className="cursor-pointer rounded-full border border-neutral-300 px-3 py-1 text-xs whitespace-nowrap transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              Als Geschenk übernehmen
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
              }}
              className="cursor-pointer rounded-full border border-neutral-300 px-3 py-1 text-xs transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
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
              className="cursor-pointer rounded-full border border-red-300 px-3 py-1 text-xs text-red-700 transition hover:bg-red-50 active:scale-95 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              Löschen
            </button>
          </div>
        </div>
      </div>

      <Modal dialogRef={deleteDialogRef} title="Idee löschen">
        <p className="text-sm">„{gift.title}“ wirklich löschen?</p>
        {deleteState?.error && (
          <p className="mt-2 text-xs text-red-700 dark:text-red-400">
            {deleteState.error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => deleteDialogRef.current?.close()}
            className="cursor-pointer rounded-full border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
          >
            Abbrechen
          </button>
          <form action={deleteAction}>
            <button
              type="submit"
              disabled={isDeletePending}
              className="cursor-pointer rounded-full bg-red-700 px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletePending ? "Wird gelöscht …" : "Löschen"}
            </button>
          </form>
        </div>
      </Modal>

      <Modal dialogRef={convertDialogRef} title="Als Geschenk übernehmen">
        <form action={convertAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Anlass
            <div className="relative">
              <select
                name="occasionId"
                defaultValue={gift.occasion_id ?? ""}
                className="w-full appearance-none rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 pr-9 text-base dark:border-neutral-600 sm:text-sm"
              >
                <option value="">Ohne Anlass</option>
                {occasions.map((occasion) => (
                  <option key={occasion.id} value={occasion.id}>
                    {occasion.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Datum
            <input
              type="date"
              name="giftDate"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notiz (optional)
            <textarea
              name="description"
              rows={2}
              placeholder="z. B. hat sich sehr gefreut"
              className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
            />
          </label>
          {convertState?.error && (
            <p className="text-xs text-red-700 dark:text-red-400">
              {convertState.error}
            </p>
          )}
          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => convertDialogRef.current?.close()}
              className="cursor-pointer rounded-full border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isConvertPending}
              className="cursor-pointer rounded-full bg-btn-bg px-3 py-1.5 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConvertPending ? "…" : "Übernehmen"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Aufgaben-Platzhalter - Checkliste folgt erst in Stufe 3 (#94). */}
      <p className="mt-3 border-t border-dashed border-neutral-200 pt-3 text-xs text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
        Aufgaben folgen in einer späteren Ausbaustufe (#94).
      </p>
    </li>
  );
}
