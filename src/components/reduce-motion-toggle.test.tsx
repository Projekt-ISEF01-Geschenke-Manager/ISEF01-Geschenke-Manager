// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ReduceMotionToggle } from "./reduce-motion-toggle";

beforeEach(() => {
  document.documentElement.removeAttribute("data-reduce-motion");
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("ReduceMotionToggle", () => {
  it("ist beim Mount unmarkiert, wenn kein manueller Schalter gespeichert ist", () => {
    render(<ReduceMotionToggle />);

    expect(screen.getByRole("checkbox", { name: /bewegung reduzieren/i })).toHaveProperty(
      "checked",
      false,
    );
  });

  it("uebernimmt den gespeicherten Zustand beim Mount", () => {
    document.documentElement.setAttribute("data-reduce-motion", "true");
    localStorage.setItem("reduceMotion", "true");
    render(<ReduceMotionToggle />);

    expect(screen.getByRole("checkbox", { name: /bewegung reduzieren/i })).toHaveProperty(
      "checked",
      true,
    );
  });

  it("setzt data-reduce-motion und localStorage beim Aktivieren und Deaktivieren", () => {
    render(<ReduceMotionToggle />);
    const toggle = screen.getByRole("checkbox", { name: /bewegung reduzieren/i });

    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute("data-reduce-motion")).toBe("true");
    expect(localStorage.getItem("reduceMotion")).toBe("true");

    fireEvent.click(toggle);
    expect(document.documentElement.hasAttribute("data-reduce-motion")).toBe(false);
    expect(localStorage.getItem("reduceMotion")).toBe("false");
  });
});
