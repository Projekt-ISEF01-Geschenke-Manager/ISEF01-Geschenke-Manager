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

  const values = {
    name,
    birthdayDay: birthdayDayRaw,
    birthdayMonth: birthdayMonthRaw,
    birthdayYear: birthdayYearRaw,
    interests: interestsRaw,
    notes,
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

// Zweiter Parameter (prevState von useActionState) wird nicht ausgewertet,
// muss aber fuer die Bindung an useActionState in der Signatur stehen.
export async function deletePerson(
  personId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState?: DeletePersonState,
): Promise<DeletePersonState> {
  const supabase = await createClient();
  // RLS stellt sicher, dass nur die eigene Person geloescht werden kann,
  // auch falls personId manipuliert wird.
  const { error } = await supabase.from("people").delete().eq("id", personId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  // success:true macht den Erfolg vom Ausgangszustand (undefined)
  // unterscheidbar - wichtig fuer Aufrufer, die danach weiterleiten
  // wollen (z. B. von der Personenseite zurueck zur Uebersicht).
  return { success: true };
}
