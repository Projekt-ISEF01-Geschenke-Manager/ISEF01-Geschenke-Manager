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
});
