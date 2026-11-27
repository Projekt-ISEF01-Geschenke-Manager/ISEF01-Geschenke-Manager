"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidHttpUrl } from "@/lib/url";
import { GIFT_STATUSES, type GiftStatus } from "@/lib/gift-status";
import {
  GIFT_IMAGE_BUCKET,
  MAX_GIFT_IMAGE_BYTES,
  ALLOWED_GIFT_IMAGE_TYPES,
  giftImagePath,
} from "@/lib/gift-image";
import { fetchLinkPreview } from "@/lib/link-preview";

export type { GiftStatus };

// Server Actions sind als Endpunkte aufrufbar, nicht nur ueber das eigene
// Formular - formData.get() kann daher null oder eine File liefern statt
// des erwarteten Strings. Gibt in dem Fall "" zurueck statt mit .trim() auf
// null/File zu crashen, siehe auth.ts.
function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
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

  // Best-effort: Vorschaubild vom Link (og:image) ermitteln, falls ein Link
  // angegeben ist - schlaegt das fehl (keine Seite, kein og:image, Timeout,
  // SSRF-Block), bleibt die Idee trotzdem speicherbar, nur ohne Vorschau.
  const linkPreviewUrl = link ? await fetchLinkPreview(link) : null;

  const { error } = await supabase.from("gifts").insert({
    user_id: user.id,
    person_id: personId,
    occasion_id: occasionId || null,
    title,
    link: link || null,
    link_preview_url: linkPreviewUrl,
  });

  if (error) {
    return { error: error.message, values };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

// Spiegelt updatePerson() in people.ts: giftId per bind() vorne angehängt,
// Person bleibt beim Bearbeiten unveraendert (eine Idee kann nicht einer
// anderen Person zugeordnet werden) - deshalb kein personId-Feld im
// Formular, values.personId bleibt leer und wird von GiftItem nicht
// angezeigt.
export async function updateGift(
  giftId: string,
  _prevState: GiftFormState,
  formData: FormData,
): Promise<GiftFormState> {
  const title = formString(formData.get("title"));
  const link = formString(formData.get("link"));
  const occasionId = formString(formData.get("occasionId"));
  const image = formData.get("image");

  const values = { personId: "", title, link, occasionId };

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

  const { data: currentGift } = await supabase
    .from("gifts")
    .select("link")
    .eq("id", giftId)
    .single();

  const update: Record<string, unknown> = {
    title,
    link: link || null,
    occasion_id: occasionId || null,
  };

  // Vorschaubild vom Link nur neu ermitteln, wenn sich der Link tatsaechlich
  // geaendert hat - sonst wuerde jede Bearbeitung (auch nur Titel/Anlass)
  // unnoetig einen Netzwerk-Request an die fremde Seite ausloesen.
  if (link !== (currentGift?.link ?? "")) {
    update.link_preview_url = link ? await fetchLinkPreview(link) : null;
  }

  // Leeres <input type="file"> liefert ein File mit Groesse 0, nicht null -
  // nur dann tatsaechlich hochladen, sonst bleibt image_url unveraendert.
  if (image instanceof File && image.size > 0) {
    if (!ALLOWED_GIFT_IMAGE_TYPES.includes(image.type as (typeof ALLOWED_GIFT_IMAGE_TYPES)[number])) {
      return {
        error: "Bitte lade ein Bild im Format JPEG, PNG, WebP oder GIF hoch.",
        values,
      };
    }
    if (image.size > MAX_GIFT_IMAGE_BYTES) {
      return { error: "Das Bild darf höchstens 4 MB groß sein.", values };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Bitte melde dich erneut an.", values };
    }

    const path = giftImagePath(user.id, giftId);
    const { error: uploadError } = await supabase.storage
      .from(GIFT_IMAGE_BUCKET)
      .upload(path, image, { contentType: image.type, upsert: true });
    if (uploadError) {
      return { error: uploadError.message, values };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(GIFT_IMAGE_BUCKET).getPublicUrl(path);
    // Ein erneuter Upload ueberschreibt denselben Pfad (upsert) - die URL
    // selbst bliebe sonst identisch, obwohl sich der Inhalt geaendert hat,
    // und Browser/CDN wuerden weiter die alte Datei aus dem Cache zeigen
    // (Review-Fund). Cache-Buster erzwingt einen frischen Abruf. crypto.
    // randomUUID() statt Date.now(), damit zwei Uploads in derselben
    // Millisekunde nie dieselbe URL ergeben.
    update.image_url = `${publicUrl}?v=${crypto.randomUUID()}`;
  }

  // RLS stellt sicher, dass nur die eigene Idee bearbeitet werden kann,
  // auch falls giftId manipuliert wird.
  const { error } = await supabase.from("gifts").update(update).eq("id", giftId);

  if (error) {
    return { error: error.message, values };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

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

  // Best-effort: Bild-Datei mitloeschen, falls vorhanden. Schlaegt das fehl
  // (oder gab es nie eine), blockiert das nicht das Loeschen der Idee selbst.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.storage.from(GIFT_IMAGE_BUCKET).remove([giftImagePath(user.id, giftId)]);
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export type AddPastGiftState =
  | {
      error?: string;
      success?: boolean;
      values?: {
        title: string;
        occasionId: string;
        giftDate: string;
        description: string;
      };
    }
  | undefined;

// #21: Geschenk direkt als "Frühere Geschenke"-Eintrag anlegen, ohne den
// Umweg über eine Idee - fuer Geschenke, die schon vor der Nutzung der App
// gegeben wurden, spontane Geschenke ohne vorherige Idee, oder Anlaesse
// ohne festes Datum (eigene Anlaesse/"ohne Anlass"), die der taegliche
// convert-past-gifts-Job nicht automatisch erfassen kann (siehe dort).
export async function addPastGift(
  personId: string,
  _prevState: AddPastGiftState,
  formData: FormData,
): Promise<AddPastGiftState> {
  const title = formString(formData.get("title"));
  const occasionId = formString(formData.get("occasionId"));
  const giftDate = formString(formData.get("giftDate"));
  const description = formString(formData.get("description"));

  const values = { title, occasionId, giftDate, description };

  if (!title) {
    return { error: "Bitte gib einen Titel für das Geschenk ein.", values };
  }
  if (!giftDate) {
    return { error: "Bitte gib ein Datum an.", values };
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
    status: "given",
    gift_date: giftDate,
    description: description || null,
  });

  if (error) {
    return { error: error.message, values };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
