"use client";

import { useActionState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { createGift, type GiftFormState } from "@/app/actions/gifts";

type Occasion = { id: string; name: string };

// Schnelleingabe (Z1, A8, Personenseite-Wireframe): Titel ist Pflicht, Link
// und Anlass optional direkt mit dabei (Feedback: beides separat
// nachtraeglich einzufuegen macht wenig Sinn, man hat beides ja meist schon
// beim Anlegen zur Hand). Bild ergaenzt man weiterhin danach per Klick auf
// die Idee (GiftItem-Bearbeiten-Modus), nicht hier.
export function QuickAddGiftForm({
  personId,
  occasions,
}: {
  personId: string;
  occasions: Occasion[];
}) {
  const [state, formAction, isPending] = useActionState<
    GiftFormState,
    FormData
  >(createGift, undefined);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      titleRef.current?.focus();
    }
  }, [state]);

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="personId" value={personId} />
        <input
          ref={titleRef}
          type="text"
          name="title"
          required
          placeholder="Neue Idee, z. B. Gartenschere …"
          className="h-11 min-w-0 rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 text-base sm:text-sm"
        />
        {/* Stapelt auf Mobile statt nebeneinander - bei fester Select-Breite
            staucht es sonst auf schmalen Bildschirmen. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            type="url"
            name="link"
            placeholder="Link (optional), z. B. https://…"
            className="h-10 min-w-0 rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 text-base sm:min-w-[160px] sm:flex-1 sm:text-sm"
          />
          {/* appearance-none + eigenes Chevron-Icon statt des
              Browser-Pfeils - der sass bei rounded-md/px-3 zu nah am
              rechten Rand bzw. nicht vertikal zentriert (Feedback: "Pfeil
              sitzt nicht ganz richtig"). */}
          <div className="relative min-w-0 sm:min-w-[160px] sm:flex-1">
            <select
              name="occasionId"
              defaultValue=""
              className="h-10 w-full appearance-none rounded-lg border border-input-border bg-input-bg focus:border-focus-ring focus:ring-3 focus:ring-focus-ring/25 focus:outline-none px-3 pr-9 text-base sm:text-sm"
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
        </div>
        {/* Button unter den Feldern statt daneben (Feedback: "Button bitte
            unter den Anlass") - auf Mobile ohnehin voll, ab sm: nur so breit
            wie der Text braucht, wie der "Idee speichern"-Button in
            GiftForm. */}
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary w-full sm:w-auto sm:self-start"
        >
          {isPending ? "…" : "Speichern"}
        </button>
      </form>
      {state?.error ? (
        <p className="mt-1 text-xs text-danger">
          {state.error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          Bild ergänzt du danach – oder über „+ Idee erfassen“.
        </p>
      )}
    </div>
  );
}
