"use server";

import { createClient } from "@/lib/supabase/server";
import { THEME_COLORS, type PaletteId } from "@/lib/theme-color";

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

function isPaletteId(value: string): value is PaletteId {
  return value in THEME_COLORS;
}

// Speichert die gewaehlte Farbpalette kontoweit in user_metadata (#207),
// nach demselben Muster wie remind_birthdays/remind_christmas oben - wird
// von palette-picker.tsx nur fuer eingeloggte Nutzer:innen aufgerufen
// (persist-Prop), anonyme Besucher:innen bleiben bei localStorage.
export async function savePalettePreference(palette: string): Promise<void> {
  if (!isPaletteId(palette)) return;
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { palette } });
}
