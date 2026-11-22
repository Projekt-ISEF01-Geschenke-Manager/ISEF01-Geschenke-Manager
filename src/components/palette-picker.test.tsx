// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { PalettePicker } from "./palette-picker";
import { THEME_COLORS } from "@/lib/theme-color";

beforeEach(() => {
  document.documentElement.removeAttribute("data-palette");
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
  document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
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
});
