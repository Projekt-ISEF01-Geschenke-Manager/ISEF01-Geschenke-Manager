"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Server Actions sind als Endpunkte aufrufbar, nicht nur ueber das eigene
// Formular - formData.get() kann daher null oder eine File liefern statt
// des erwarteten Strings. Gibt in dem Fall "" zurueck statt mit .trim() auf
// null/File zu crashen, siehe auth.ts.
function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

// Nur http(s)-Links erlauben, bevor der Wert gespeichert und spaeter als
// <a href> gerendert wird - sonst waeren z. B. javascript:-URLs moeglich.
function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type GiftFormState =
  | {
      error?: string;
      success?: boolean;
      values?: {
        personId: string;
        title: string;
        link: string;
        occasionId: string;
      };
    }
  | undefined;

// A8: "Pflichtfelder nur Person und Titel; Link optional" - Bild/Anlass
// ausfuehrlicher editieren folgt mit der Personenseite (A5)/Stufe 3.
export async function createGift(
  _prevState: GiftFormState,
  formData: FormData,
): Promise<GiftFormState> {
  const personId = formString(formData.get("personId"));
  const title = formString(formData.get("title"));
  const link = formString(formData.get("link"));
  const occasionId = formString(formData.get("occasionId"));

  const values = { personId, title, link, occasionId };

  if (!personId) {
    return { error: "Bitte wähle aus, für wen die Idee ist.", values };
  }
  if (!title) {
    return { error: "Bitte gib einen Titel für die Idee ein.", values };
  }
  if (link && !isValidHttpUrl(link)) {
    return {
      error: "Bitte gib einen gültigen Link an (beginnend mit http:// oder https://).",
      values,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Bitte melde dich erneut an.", values };
  }

  const { error } = await supabase.from("gifts").insert({
    user_id: user.id,
    person_id: personId,
    occasion_id: occasionId || null,
    title,
    link: link || null,
  });

  if (error) {
    return { error: error.message, values };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

const GIFT_STATUSES = ["idea", "purchased"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

export async function setGiftStatus(giftId: string, status: GiftStatus) {
  if (!GIFT_STATUSES.includes(status)) {
    throw new Error(`Ungültiger Status: ${status}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("gifts")
    .update({ status })
    .eq("id", giftId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard", "layout");
}

export type DeleteGiftState = { error?: string; success?: boolean } | undefined;

export async function deleteGift(
  giftId: string,
  // Zweiter Parameter (prevState von useActionState) wird nicht
  // ausgewertet, muss aber fuer die Bindung in der Signatur stehen.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState?: DeleteGiftState,
): Promise<DeleteGiftState> {
  const supabase = await createClient();
  // RLS stellt sicher, dass nur die eigene Idee geloescht werden kann,
  // auch falls giftId manipuliert wird.
  const { error } = await supabase.from("gifts").delete().eq("id", giftId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
