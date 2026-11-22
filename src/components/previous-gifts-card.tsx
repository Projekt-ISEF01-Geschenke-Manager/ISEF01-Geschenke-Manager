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
    <div className="surface rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Frühere Geschenke</h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="btn btn-secondary btn-sm"
        >
          + Geschenk nachtragen
        </button>
      </div>

      {gifts.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Noch keine früheren Geschenke für {personName}.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {gifts.map((gift) => (
            <li
              key={gift.id}
              className="surface rounded-2xl p-4"
            >
              <p className="font-semibold">{gift.title}</p>
              <p className="mt-1 text-sm text-muted">
                {gift.occasion_name ?? "ohne Anlass"} ·{" "}
                {formatGiftDate(gift.gift_date)}
              </p>
              {gift.description && (
                <p className="mt-1.5 text-sm text-muted">
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
              className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-2.5 py-1.5 text-base sm:text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Anlass
            <div className="relative">
              <select
                name="occasionId"
                defaultValue={state?.values?.occasionId ?? ""}
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
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Datum
            <input
              type="date"
              name="giftDate"
              required
              defaultValue={state?.values?.giftDate}
              className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-2.5 py-1.5 text-base sm:text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notiz (optional)
            <textarea
              name="description"
              rows={2}
              placeholder="z. B. hat sich sehr gefreut"
              defaultValue={state?.values?.description}
              className="rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-2.5 py-1.5 text-base sm:text-sm"
            />
          </label>
          {state?.error && (
            <p className="text-xs text-danger">
              {state.error}
            </p>
          )}
          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="btn btn-secondary btn-sm"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-sm"
            >
              {isPending ? "…" : "Hinzufügen"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
