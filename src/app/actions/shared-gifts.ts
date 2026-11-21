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
export async function toggleGiftStatusViaSharedLink(
  token: string,
  giftId: string,
  nextStatus: GiftStatus,
): Promise<SharedGiftStatusState> {
  if (!GIFT_STATUSES.includes(nextStatus)) {
    return { error: "Ungültiger Status." };
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

  const { error } = await supabase
    .from("gifts")
    .update({ status: nextStatus })
    .eq("id", giftId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teilen/${token}`);
  return { success: true };
}
