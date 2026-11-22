"use server";

import { createClient } from "@/lib/supabase/server";

export type ReminderSettingsState = { error?: string; success?: boolean } | undefined;

export async function updateReminderSettings(
  _prevState: ReminderSettingsState,
  formData: FormData,
): Promise<ReminderSettingsState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      remind_birthdays: formData.has("remindBirthdays"),
      remind_christmas: formData.has("remindChristmas"),
    },
  });
  if (error) return { error: error.message };
  return { success: true };
}
