// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEME_COLORS } from "@/lib/theme-color";

const savePalettePreferenceMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/app/actions/settings", () => ({
  savePalettePreference: savePalettePreferenceMock,
}));

const { PalettePicker } = await import("./palette-picker");

beforeEach(() => {
  document.documentElement.removeAttribute("data-palette");
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
  document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
  savePalettePreferenceMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("PalettePicker", () => {
  it("setzt data-palette, speichert die Wahl und aktualisiert das theme-color-Meta-Tag (#208)", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<PalettePicker />);

    fireEvent.click(screen.getByLabelText("Farbdesign wählen"));
    fireEvent.click(screen.getByRole("button", { name: "Salbei" }));

    expect(document.documentElement.getAttribute("data-palette")).toBe("salbei");
    expect(localStorage.getItem("palette")).toBe("salbei");
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
    ).toBe(THEME_COLORS.salbei.dark);
  });

  it("speichert die Wahl ohne persist-Prop nicht kontoweit (anonym, #207)", () => {
    render(<PalettePicker />);

    fireEvent.click(screen.getByLabelText("Farbdesign wählen"));
    fireEvent.click(screen.getByRole("button", { name: "Salbei" }));

    expect(savePalettePreferenceMock).not.toHaveBeenCalled();
  });

  it("speichert die Wahl bei persist=true zusaetzlich kontoweit (#207)", async () => {
    render(<PalettePicker persist />);

    fireEvent.click(screen.getByLabelText("Farbdesign wählen"));
    fireEvent.click(screen.getByRole("button", { name: "Ozean" }));

    await waitFor(() => {
      expect(savePalettePreferenceMock).toHaveBeenCalledWith("ozean");
    });
  });

  it("uebernimmt die Konto-Palette, wenn dieses Geraet noch keine eigene Wahl hat (#207)", async () => {
    render(<PalettePicker persist initialAccountPalette="graphit" />);

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-palette")).toBe("graphit");
    });
    expect(localStorage.getItem("palette")).toBe("graphit");
  });

  it("laesst eine bereits vorhandene lokale Wahl unangetastet (#207)", () => {
    localStorage.setItem("palette", "beere");
    document.documentElement.setAttribute("data-palette", "beere");

    render(<PalettePicker persist initialAccountPalette="graphit" />);

    expect(document.documentElement.getAttribute("data-palette")).toBe("beere");
    expect(localStorage.getItem("palette")).toBe("beere");
  });
});
