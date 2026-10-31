// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Toast } from "./toast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("Toast", () => {
  it("zeigt nichts, wenn keine Nachricht gesetzt ist", () => {
    render(<Toast message={null} onDismiss={() => {}} />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("zeigt die Nachricht und blendet sie von selbst wieder aus", () => {
    const onDismiss = vi.fn();
    render(<Toast message="Person wurde hinzugefügt" onDismiss={onDismiss} />);

    expect(screen.getByText("Person wurde hinzugefügt")).not.toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it(
    "schließt sich trotzdem nach 3s, auch wenn der Elternteil mit einer " +
      "neuen onDismiss-Referenz neu rendert (z. B. durch einen Re-Render " +
      "aus einem anderen Grund)",
    () => {
      const dismissCalls: number[] = [];
      let renderCount = 0;
      const { rerender } = render(
        <Toast
          message="Idee wurde erfasst"
          onDismiss={() => dismissCalls.push(++renderCount)}
        />,
      );

      // Neue Funktionsreferenz, wie sie z. B. "() => setToastMessage(null)"
      // bei jedem Render von DashboardOverview waere - darf den Timer NICHT
      // zuruecksetzen, sonst bliebe der Toast bei haeufigen Re-Renders
      // dauerhaft sichtbar statt nach 3s zu verschwinden.
      vi.advanceTimersByTime(1500);
      rerender(
        <Toast
          message="Idee wurde erfasst"
          onDismiss={() => dismissCalls.push(++renderCount)}
        />,
      );
      vi.advanceTimersByTime(1500);

      expect(dismissCalls).toHaveLength(1);
    },
  );
});
