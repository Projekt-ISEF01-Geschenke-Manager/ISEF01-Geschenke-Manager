"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateSharedLinkState =
  | { error?: string; token?: string }
  | undefined;

// A10 (MVP): ein Link kann mehrere Personen zeigen, Personen koennen ueber
// mehrere Links gleichzeitig geteilt werden.
export async function createSharedLink(
  _prevState: CreateSharedLinkState,
  formData: FormData,
): Promise<CreateSharedLinkState> {
  const personIds = formData
    .getAll("personId")
    .filter((value): value is string => typeof value === "string" && value !== "");

  if (personIds.length === 0) {
    return { error: "Bitte wähle mindestens eine Person aus." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Bitte melde dich erneut an." };
  }

  const { data: link, error: linkError } = await supabase
    .from("shared_links")
    .insert({ user_id: user.id })
    .select("id, token")
    .single();

  if (linkError || !link) {
    return { error: linkError?.message ?? "Link konnte nicht erstellt werden." };
  }

  const { error: peopleError } = await supabase
    .from("shared_link_people")
    .insert(personIds.map((personId) => ({ shared_link_id: link.id, person_id: personId })));

  if (peopleError) {
    // Ein Link ohne zugeordnete Personen waere nutzlos (zeigt niemanden) -
    // aufraeumen statt eine Karteileiche zu hinterlassen.
    await supabase.from("shared_links").delete().eq("id", link.id);
    return { error: peopleError.message };
  }

  revalidatePath("/dashboard", "layout");
  return { token: link.token };
}

export type DeleteSharedLinkState = { error?: string; success?: boolean } | undefined;

// "Widerrufen" = Zeile loeschen (Cascade loescht shared_link_people mit),
// siehe docs/database-schema.md.
export async function deleteSharedLink(
  linkId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState?: DeleteSharedLinkState,
): Promise<DeleteSharedLinkState> {
  const supabase = await createClient();
  const { error } = await supabase.from("shared_links").delete().eq("id", linkId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
