"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GIFT_IMAGE_BUCKET, giftImagePath } from "@/lib/gift-image";

// Server Actions sind als Endpunkte aufrufbar, nicht nur ueber das eigene
// Formular - formData.get() kann daher null oder eine File liefern statt
// des erwarteten Strings. Gibt in dem Fall "" zurueck statt mit .trim() auf
// null/File zu crashen, siehe auth.ts.
function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type PersonFormState =
  | {
      error?: string;
      success?: boolean;
      values?: {
        name: string;
        birthdayDay: string;
        birthdayMonth: string;
        birthdayYear: string;
        interests: string;
        notes: string;
        remindersEnabled: boolean;
      };
    }
  | undefined;

type ParsedPerson = {
  name: string;
  birthdayDay: number | null;
  birthdayMonth: number | null;
  birthdayYear: number | null;
  interests: string[];
  notes: string | null;
  remindersEnabled: boolean;
};

function parsePersonFields(formData: FormData):
  | { error: string; values: NonNullable<PersonFormState>["values"] }
  | { values: NonNullable<PersonFormState>["values"]; data: ParsedPerson } {
  const name = formString(formData.get("name"));
  const birthdayDayRaw = formString(formData.get("birthdayDay"));
  const birthdayMonthRaw = formString(formData.get("birthdayMonth"));
  const birthdayYearRaw = formString(formData.get("birthdayYear"));
  const interestsRaw = formString(formData.get("interests"));
  const notes = formString(formData.get("notes"));
  // Unangehakte Checkboxen werden von Browsern gar nicht erst in die
  // FormData aufgenommen - formData.has() statt formData.get(), da ein
  // leerer/"off"-Wert hier nicht vorkommt (siehe Checkbox in PersonForm).
  const remindersEnabled = formData.has("remindersEnabled");

  const values = {
    name,
    birthdayDay: birthdayDayRaw,
    birthdayMonth: birthdayMonthRaw,
    birthdayYear: birthdayYearRaw,
    interests: interestsRaw,
    notes,
    remindersEnabled,
  };

  if (!name) {
    return { error: "Bitte gib einen Namen ein.", values };
  }

  const hasDay = birthdayDayRaw !== "";
  const hasMonth = birthdayMonthRaw !== "";
  if (hasDay !== hasMonth) {
    return {
      error: "Bitte Tag und Monat des Geburtstags zusammen angeben.",
      values,
    };
  }

  let birthdayDay: number | null = null;
  let birthdayMonth: number | null = null;

  if (hasDay && hasMonth) {
    birthdayDay = Number(birthdayDayRaw);
    birthdayMonth = Number(birthdayMonthRaw);
    if (!Number.isInteger(birthdayMonth) || birthdayMonth < 1 || birthdayMonth > 12) {
      return { error: "Der Monat muss zwischen 1 und 12 liegen.", values };
    }
    if (
      !Number.isInteger(birthdayDay) ||
      birthdayDay < 1 ||
      birthdayDay > DAYS_IN_MONTH[birthdayMonth - 1]
    ) {
      return { error: "Dieser Tag gibt es in diesem Monat nicht.", values };
    }
  }

  let birthdayYear: number | null = null;
  if (birthdayYearRaw) {
    birthdayYear = Number(birthdayYearRaw);
    if (!Number.isInteger(birthdayYear) || birthdayYear < 1900 || birthdayYear > 2100) {
      return { error: "Das Geburtsjahr muss zwischen 1900 und 2100 liegen.", values };
    }
  }

  const interests = interestsRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    values,
    data: {
      name,
      birthdayDay,
      birthdayMonth,
      birthdayYear,
      interests,
      notes: notes || null,
      remindersEnabled,
    },
  };
}

// Gemeinsame Spalten-Zuordnung fuer insert/update, damit sich die beiden
// Pfade nicht auseinanderentwickeln koennen (Codacy-Review-Hinweis).
function toPersonRecord(data: ParsedPerson) {
  return {
    name: data.name,
    birthday_day: data.birthdayDay,
    birthday_month: data.birthdayMonth,
    birthday_year: data.birthdayYear,
    interests: data.interests,
    notes: data.notes,
    reminders_enabled: data.remindersEnabled,
  };
}

export async function createPerson(
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const parsed = parsePersonFields(formData);
  if ("error" in parsed) {
    return parsed;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Bitte melde dich erneut an.", values: parsed.values };
  }

  const { error } = await supabase
    .from("people")
    .insert({ user_id: user.id, ...toPersonRecord(parsed.data) });

  if (error) {
    return { error: error.message, values: parsed.values };
  }

  revalidatePath("/dashboard", "layout");
  // success:true macht den Erfolg vom Ausgangszustand (undefined)
  // unterscheidbar - das Popup auf der Übersicht schließt sich erst dann
  // automatisch (siehe PersonForm/DashboardOverview).
  return { success: true };
}

export async function updatePerson(
  personId: string,
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const parsed = parsePersonFields(formData);
  if ("error" in parsed) {
    return parsed;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("people")
    .update(toPersonRecord(parsed.data))
    .eq("id", personId);

  if (error) {
    return { error: error.message, values: parsed.values };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export type DeletePersonState = { error?: string; success?: boolean } | undefined;

// Dritter Parameter (prevState von useActionState) wird nicht ausgewertet,
// muss aber fuer die Bindung an useActionState in der Signatur stehen.
export async function deletePerson(
  personId: string,
  redirectTo?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState?: DeletePersonState,
): Promise<DeletePersonState> {
  const supabase = await createClient();

  // Gift-IDs vorher einsammeln (wie bei deleteGift) - nach dem Loeschen der
  // Person sind die Ideen durch den FK-Cascade bereits weg, deren Bild-
  // Dateien im Storage aber nicht.
  const { data: giftsData } = await supabase
    .from("gifts")
    .select("id")
    .eq("person_id", personId);

  // RLS stellt sicher, dass nur die eigene Person geloescht werden kann,
  // auch falls personId manipuliert wird.
  const { error } = await supabase.from("people").delete().eq("id", personId);

  if (error) {
    return { error: error.message };
  }

  // Best-effort: Bild-Dateien der geloeschten Ideen mitraeumen. Schlaegt das
  // fehl (oder gab es keine), blockiert das nicht das Loeschen der Person.
  if (giftsData && giftsData.length > 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.storage
        .from(GIFT_IMAGE_BUCKET)
        .remove(giftsData.map((gift) => giftImagePath(user.id, gift.id)));
    }
  }

  revalidatePath("/dashboard", "layout");

  // redirect() direkt hier statt client-seitig per router.push() in einem
  // useEffect: revalidatePath() oben sorgt dafuer, dass die aktuelle Route
  // (z. B. die jetzt geloeschte Personenseite) neu gerendert wird, sobald
  // diese Action zurueckkehrt - faende die Weiterleitung erst danach im
  // Client statt, wuerde notFound() dort zuerst greifen (404 statt
  // Weiterleitung, siehe Issue #156).
  if (redirectTo) {
    redirect(redirectTo);
  }

  // success:true macht den Erfolg vom Ausgangszustand (undefined)
  // unterscheidbar - relevant fuer Aufrufer ohne redirectTo.
  return { success: true };
}
