"use client";

import { useActionState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { formatGiftDate } from "@/lib/format";
import { addPastGift, type AddPastGiftState } from "@/app/actions/gifts";
import { Modal } from "@/components/modal";

export type PreviousGift = {
  id: string;
  title: string;
  description: string | null;
  occasion_name: string | null;
  gift_date: string;
};

type Occasion = { id: string; name: string };

// Geschenke zu Geburtstag/Weihnachten rutschen automatisch hierher (#21,
// taeglicher convert-past-gifts-Job), sobald der Anlass vorbei ist. "+
// Geschenk nachtragen" ist der manuelle Weg fuer alles, was der Job nicht
// automatisch erfassen kann: eigene Anlaesse/"ohne Anlass" (kein festes
// Datum) oder Geschenke von vor der Nutzung der App.
export function PreviousGiftsCard({
  personId,
  personName,
  occasions,
  gifts,
}: {
  personId: string;
  personName: string;
  occasions: Occasion[];
  gifts: PreviousGift[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, isPending] = useActionState<
    AddPastGiftState,
    FormData
  >(addPastGift.bind(null, personId), undefined);

  useEffect(() => {
    if (state?.success) {
      dialogRef.current?.close();
    }
  }, [state]);

  return (
    <div className="rounded-2xl border border-neutral-300 p-6 dark:border-neutral-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Frühere Geschenke</h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="cursor-pointer rounded-full border border-neutral-300 px-3 py-1 text-xs whitespace-nowrap transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
        >
          + Geschenk nachtragen
        </button>
      </div>

      {gifts.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          Noch keine früheren Geschenke für {personName}.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {gifts.map((gift) => (
            <li
              key={gift.id}
              className="rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700"
            >
              <p className="font-semibold">{gift.title}</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {gift.occasion_name ?? "ohne Anlass"} ·{" "}
                {formatGiftDate(gift.gift_date)}
              </p>
              {gift.description && (
                <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                  {gift.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal dialogRef={dialogRef} title="Geschenk nachtragen">
        <form action={formAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Titel
            <input
              type="text"
              name="title"
              required
              placeholder="z. B. Kräutergarten-Set"
              defaultValue={state?.values?.title}
              className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Anlass
            <div className="relative">
              <select
                name="occasionId"
                defaultValue={state?.values?.occasionId ?? ""}
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
              defaultValue={state?.values?.giftDate}
              className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notiz (optional)
            <textarea
              name="description"
              rows={2}
              placeholder="z. B. hat sich sehr gefreut"
              defaultValue={state?.values?.description}
              className="rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-base dark:border-neutral-600 sm:text-sm"
            />
          </label>
          {state?.error && (
            <p className="text-xs text-red-700 dark:text-red-400">
              {state.error}
            </p>
          )}
          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="cursor-pointer rounded-full border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-100 active:scale-95 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer rounded-full bg-btn-bg px-3 py-1.5 text-sm font-medium text-btn-text transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "…" : "Hinzufügen"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
