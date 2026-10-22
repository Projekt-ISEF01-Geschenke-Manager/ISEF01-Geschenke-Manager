"use client";

// Label wird rein per CSS (dark:-Variante) umgeschaltet statt per React-
// State, damit es keinen Hydration-Mismatch mit dem Inline-Script in
// layout.tsx gibt (das data-theme schon vor dem ersten Render setzt).
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private-Modus o. Ä.: Theme gilt dann nur für diese Sitzung.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Hell-/Dunkelmodus umschalten"
      className="rounded-full border border-neutral-600 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
    >
      <span className="dark:hidden">Dunkel</span>
      <span className="hidden dark:inline">Hell</span>
    </button>
  );
}
