import { formatGiftDate } from "@/lib/format";

export type PreviousGift = {
  id: string;
  title: string;
  description: string | null;
  occasion_name: string | null;
  gift_date: string;
};

// Reine Anzeige (#21: "Anzeige in der Personendetailansicht") - kein
// Bearbeiten/Löschen hier, die Umwandlung selbst passiert über GiftItem
// ("Als Geschenk übernehmen", #26). Server-Komponente, da nichts
// interaktiv ist.
export function PreviousGiftsCard({
  personName,
  gifts,
}: {
  personName: string;
  gifts: PreviousGift[];
}) {
  return (
    <div className="rounded-2xl border border-neutral-300 p-6 dark:border-neutral-700">
      <h2 className="text-lg font-semibold">Frühere Geschenke</h2>

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
    </div>
  );
}
