import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { CHRISTMAS_DAY, CHRISTMAS_MONTH, findRecentOccurrence } from "@/lib/upcoming";

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

type GiftRow = {
  id: string;
  occasions: { name: string } | null;
  people: { birthday_day: number | null; birthday_month: number | null } | null;
};

// Taeglicher Job (#21/#26): "besorgte" Geschenke zu Geburtstag/Weihnachten
// rutschen automatisch zu "Frühere Geschenke" (status "given"), sobald der
// Anlass vorbei ist - kein manueller "Als Geschenk übernehmen"-Klick mehr
// noetig. Der ließ sich bisher auch auf noch offenen Ideen klicken und
// verlangte ein manuelles Datum, das leicht falsch gesetzt werden konnte
// (Feedback: Button auf einer offenen Idee ergibt keinen Sinn, "heute" als
// Default-Datum fuehrte zu falschen Historien-Eintraegen).
//
// Eigene Anlaesse und Geschenke "ohne Anlass" haben kein festes Datum und
// werden hier bewusst NICHT automatisch verschoben - dafuer gibt es die
// manuelle "+ Geschenk nachtragen"-Aktion (addPastGift in
// src/app/actions/gifts.ts).
export async function convertPastGifts(now: Date = new Date()): Promise<void> {
  const supabase = createServiceClient();

  const christmasDate = findRecentOccurrence(CHRISTMAS_DAY, CHRISTMAS_MONTH, now);

  const { data, error } = await supabase
    .from("gifts")
    .select("id, occasions(name), people(birthday_day, birthday_month)")
    .eq("status", "purchased");

  if (error) {
    throw new Error(`Besorgte Geschenke konnten nicht geladen werden: ${error.message}`);
  }

  const updates: { id: string; giftDate: string }[] = [];
  for (const gift of (data ?? []) as unknown as GiftRow[]) {
    const occasionName = gift.occasions?.name;

    if (occasionName === "Weihnachten" && christmasDate) {
      updates.push({ id: gift.id, giftDate: toIsoDate(christmasDate) });
      continue;
    }

    if (occasionName === "Geburtstag" && gift.people?.birthday_day && gift.people?.birthday_month) {
      const birthdayDate = findRecentOccurrence(
        gift.people.birthday_day,
        gift.people.birthday_month,
        now,
      );
      if (birthdayDate) {
        updates.push({ id: gift.id, giftDate: toIsoDate(birthdayDate) });
      }
    }
  }

  // Jedes Geschenk einzeln aktualisieren statt beim ersten Fehler
  // abzubrechen, siehe deleteUnconfirmedAccounts() fuer dasselbe Muster.
  const errors: string[] = [];
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("gifts")
      .update({ status: "given", gift_date: update.giftDate })
      .eq("id", update.id);

    if (updateError) {
      errors.push(`${update.id}: ${updateError.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `${errors.length} von ${updates.length} Geschenken konnten nicht umgestellt werden: ${errors.join("; ")}`,
    );
  }
}
