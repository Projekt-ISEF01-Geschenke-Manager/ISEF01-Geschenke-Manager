export type SharedGift = {
  id: string;
  title: string;
  link: string | null;
  status: string;
  occasion_name: string | null;
};

// Rein lesend, keine Bearbeiten-Buttons - oeffentliche Teilen-Route (A10).
export function SharedGiftItem({ gift }: { gift: SharedGift }) {
  const isPurchased = gift.status === "purchased";

  return (
    <li className="flex items-center justify-between gap-3 py-2">
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
                Zum Angebot ↗
              </a>
            </>
          )}
        </p>
      </div>
      {isPurchased && (
        <span className="shrink-0 rounded-full border border-green-600 px-2.5 py-1 text-xs text-green-700 dark:border-green-500 dark:text-green-400">
          schon besorgt
        </span>
      )}
    </li>
  );
}
