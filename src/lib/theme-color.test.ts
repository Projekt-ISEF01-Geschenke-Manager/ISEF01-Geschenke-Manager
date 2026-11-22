// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { applyThemeColor, getThemeColor, THEME_COLORS, DEFAULT_PALETTE } from "./theme-color";

describe("getThemeColor", () => {
  it("liefert die Hell-Farbe der Palette, wenn theme nicht dark ist", () => {
    expect(getThemeColor("ozean", "light")).toBe(THEME_COLORS.ozean.light);
    expect(getThemeColor("ozean", null)).toBe(THEME_COLORS.ozean.light);
  });

  it("liefert die Dunkel-Farbe der Palette bei theme dark", () => {
    expect(getThemeColor("salbei", "dark")).toBe(THEME_COLORS.salbei.dark);
  });

  it("faellt bei unbekannter/fehlender Palette auf die Standardpalette zurueck", () => {
    expect(getThemeColor(null, "light")).toBe(THEME_COLORS[DEFAULT_PALETTE].light);
    expect(getThemeColor("nicht-vorhanden", "dark")).toBe(THEME_COLORS[DEFAULT_PALETTE].dark);
  });
});

describe("applyThemeColor", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-palette");
    document.documentElement.removeAttribute("data-theme");
    document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("aktualisiert den Inhalt des bestehenden theme-color-Tags passend zu data-palette/data-theme", () => {
    document.documentElement.setAttribute("data-palette", "graphit");
    document.documentElement.setAttribute("data-theme", "dark");

    applyThemeColor();

    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    ).toBe(THEME_COLORS.graphit.dark);
  });

  it("tut nichts, wenn kein theme-color-Tag im Dokument steht", () => {
    document.head.innerHTML = "";

    expect(() => applyThemeColor()).not.toThrow();
  });
});
