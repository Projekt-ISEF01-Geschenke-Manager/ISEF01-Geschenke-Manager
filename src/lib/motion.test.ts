// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { canAnimate } from "./motion";

function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  document.documentElement.removeAttribute("data-reduce-motion");
});

afterEach(() => {
  // @ts-expect-error -- in Tests gesetzter Mock wird wieder entfernt
  delete window.matchMedia;
  document.documentElement.removeAttribute("data-reduce-motion");
});

describe("canAnimate", () => {
  it("ist true, wenn weder OS noch manueller Schalter Bewegung reduzieren", () => {
    mockMatchMedia(false);
    expect(canAnimate()).toBe(true);
  });

  it("ist false, wenn die OS-Einstellung Bewegung reduziert", () => {
    mockMatchMedia(true);
    expect(canAnimate()).toBe(false);
  });

  it("ist false, wenn der manuelle Schalter aktiv ist, auch ohne OS-Einstellung", () => {
    mockMatchMedia(false);
    document.documentElement.setAttribute("data-reduce-motion", "true");
    expect(canAnimate()).toBe(false);
  });
});
