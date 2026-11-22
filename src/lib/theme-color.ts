// Farbe fuer <meta name="theme-color"> pro Palette+Modus, passend zum
// --header-bg-Token der jeweiligen Kombination in globals.css (Issue #208:
// iOS Safari leitet Statusleisten-/Oberflaechenfarbe aus diesem Tag ab).
// "klassisch" nutzt fuer --header-bg einen Farbverlauf, den theme-color
// nicht darstellen kann - dort steht fuer beide Modi der erste Gradient-Stop
// als repraesentative Volltonfarbe.
export type PaletteId = "rose" | "klassisch" | "beere" | "ozean" | "salbei" | "graphit";

export const DEFAULT_PALETTE: PaletteId = "rose";

export const THEME_COLORS: Record<PaletteId, { light: string; dark: string }> = {
  rose: { light: "#7a4a58", dark: "#2a1b21" },
  klassisch: { light: "#a57878", dark: "#a57878" },
  beere: { light: "#7d1a4a", dark: "#24141c" },
  ozean: { light: "#1d4f7c", dark: "#14212e" },
  salbei: { light: "#2a5d41", dark: "#15241b" },
  graphit: { light: "#26262d", dark: "#1a1a1f" },
};

function isPaletteId(value: string | null): value is PaletteId {
  return !!value && value in THEME_COLORS;
}

export function getThemeColor(palette: string | null, theme: string | null): string {
  const entry = THEME_COLORS[isPaletteId(palette) ? palette : DEFAULT_PALETTE];
  return theme === "dark" ? entry.dark : entry.light;
}

// Liest die aktuell am <html>-Element gesetzte Palette/Modus aus und
// schreibt die passende Farbe ins theme-color-Meta-Tag. Wird nach jedem
// Wechsel in palette-picker.tsx und theme-toggle.tsx aufgerufen; das
// Inline-Script in layout.tsx macht dasselbe vor dem ersten Paint.
export function applyThemeColor(): void {
  const root = document.documentElement;
  const content = getThemeColor(
    root.getAttribute("data-palette"),
    root.getAttribute("data-theme"),
  );
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", content);
}
