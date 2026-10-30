// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./theme-toggle";

beforeEach(() => {
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("ThemeToggle", () => {
  it("übernimmt aria-checked=false, wenn data-theme beim Mount hell ist", () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);

    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("übernimmt aria-checked=true, wenn data-theme beim Mount dunkel ist", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle />);

    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("wechselt data-theme, aria-checked und localStorage bei jedem Klick", () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);
    const toggle = screen.getByRole("switch");

    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem("theme")).toBe("dark");

    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
