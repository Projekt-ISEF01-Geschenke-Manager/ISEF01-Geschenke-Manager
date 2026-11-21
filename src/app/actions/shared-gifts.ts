"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { checkAndRecordAttempt, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { GIFT_STATUSES, type GiftStatus } from "@/lib/gift-status";

export type SharedGiftStatusState = { error?: string; success?: boolean } | undefined;

// Oeffentliche, unauthentifizierte Aktion fuer die geteilte Ansicht (A10) -
// Besucher ohne Konto koennen eine Idee als besorgt/offen markieren, damit
// nicht mehrere Leute dasselbe Geschenk kaufen (Feedback: "sonst weiß
// niemand was schon besorgt wurde"). Laeuft ueber den Service-Role-Client,
// weil es keinen eingeloggten Nutzer gibt, gegen den RLS pruefen koennte -
// der Token selbst ist das Zugriffsrecht (wie beim Lesen der Seite, siehe
// page.tsx), deshalb die Zugehoerigkeits-Pruefung unten von Hand.
const MAX_PURCHASED_BY_LENGTH = 80;

export async function toggleGiftStatusViaSharedLink(
  token: string,
  giftId: string,
  nextStatus: GiftStatus,
  // Zweiter/dritter Parameter von useActionState (prevState/formData) -
  // Name kommt ueber formData statt als eigenes Argument, weil er anders
  // als token/giftId/nextStatus erst beim Absenden des Popups feststeht,
  // nicht schon beim Binden der Aktion (siehe shared-gift-item.tsx).
  // Freiwillige Namensangabe beim Markieren als besorgt (Feedback: "Max hat
  // das schon besorgt" statt nur "besorgt", da mehrere anonyme Besucher
  // denselben Link nutzen koennen). Wird beim Zuruecksetzen auf "idea"
  // ignoriert - siehe purchasedBy-Zuweisung unten.
  _prevState: SharedGiftStatusState,
  formData: FormData,
): Promise<SharedGiftStatusState> {
  if (!GIFT_STATUSES.includes(nextStatus)) {
    return { error: "Ungültiger Status." };
  }

  const rawName = formData.get("purchasedBy");
  const trimmedName =
    (typeof rawName === "string" ? rawName.trim() : "") || null;
  if (trimmedName && trimmedName.length > MAX_PURCHASED_BY_LENGTH) {
    return {
      error: `Name darf höchstens ${MAX_PURCHASED_BY_LENGTH} Zeichen lang sein.`,
    };
  }

  const { limited } = await checkAndRecordAttempt(
    "shared-status-toggle",
    token,
    { maxAttempts: 30 },
  );
  if (limited) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const supabase = createServiceClient();

  const { data: link } = await supabase
    .from("shared_links")
    .select("shared_link_people(person_id)")
    .eq("token", token)
    .single();

  if (!link) {
    return { error: "Dieser Link ist nicht mehr gültig." };
  }

  const allowedPersonIds = new Set(
    (
      link.shared_link_people as unknown as { person_id: string }[]
    ).map((entry) => entry.person_id),
  );

  const { data: gift } = await supabase
    .from("gifts")
    .select("id, person_id")
    .eq("id", giftId)
    .single();

  // Nur Ideen umschalten, die tatsaechlich zu einer ueber DIESEN Token
  // freigegebenen Person gehoeren - sonst koennte ein gueltiger Token
  // genutzt werden, um eine fremde giftId (von einer anderen, nicht
  // freigegebenen Person) umzuschalten.
  if (!gift || !allowedPersonIds.has(gift.person_id)) {
    return { error: "Diese Idee gehört nicht zu diesem geteilten Link." };
  }

  // Beim Zuruecksetzen auf "idea" (nicht mehr besorgt) auch den Namen
  // wieder leeren - sonst stuende nach einem Rueckgaengig noch der alte
  // Name bei einer wieder offenen Idee.
  const { error } = await supabase
    .from("gifts")
    .update({
      status: nextStatus,
      purchased_by: nextStatus === "purchased" ? trimmedName : null,
    })
    .eq("id", giftId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teilen/${token}`);
  return { success: true };
}
