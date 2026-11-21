// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickAddGiftForm } from "./quick-add-gift-form";

const createGiftMock = vi.fn();
vi.mock("@/app/actions/gifts", () => ({
  createGift: (...args: unknown[]) => createGiftMock(...args),
}));

afterEach(() => {
  cleanup();
  createGiftMock.mockReset();
});

describe("QuickAddGiftForm", () => {
  it("zeigt Titel- und ein optionales Link-Feld, aber kein Anlass-Feld (Z1, A8: Schnelleingabe)", () => {
    render(<QuickAddGiftForm personId="person-1" />);

    expect(
      screen.getByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
    ).not.toBeNull();
    const linkInput = document.querySelector('input[name="link"]');
    expect(linkInput).not.toBeNull();
    expect(linkInput).not.toHaveProperty("required", true);
    expect(document.querySelector('select[name="occasionId"]')).toBeNull();
  });

  it("übergibt die personId versteckt mit und speichert Titel und Link", async () => {
    createGiftMock.mockResolvedValue({ success: true });
    render(<QuickAddGiftForm personId="person-42" />);

    fireEvent.change(
      screen.getByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
      { target: { value: "Gartenschere" } },
    );
    fireEvent.change(screen.getByPlaceholderText(/link \(optional\)/i), {
      target: { value: "https://shop-beispiel.de/gartenschere" },
    });
    fireEvent.click(screen.getByRole("button", { name: /speichern/i }));

    await waitFor(() => expect(createGiftMock).toHaveBeenCalled());
    const formData = createGiftMock.mock.calls[0][1] as FormData;
    expect(formData.get("personId")).toBe("person-42");
    expect(formData.get("title")).toBe("Gartenschere");
    expect(formData.get("link")).toBe("https://shop-beispiel.de/gartenschere");
  });

  it("leert das Feld und fokussiert es wieder nach erfolgreichem Speichern", async () => {
    createGiftMock.mockResolvedValue({ success: true });
    render(<QuickAddGiftForm personId="person-1" />);

    fireEvent.change(
      screen.getByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
      { target: { value: "Gartenschere" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /speichern/i }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText<HTMLInputElement>(
          /neue idee, z\. b\. gartenschere/i,
        ).value,
      ).toBe("");
    });
    // Eigener waitFor-Block statt direkt im Anschluss an den vorigen -
    // Reset und Fokus passieren im selben Effect, liefen in CI aber
    // offenbar nicht immer in derselben Microtask-Runde wie der
    // Value-Check (dort schlug die Assertion sporadisch fehl, lokal nie).
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
      );
    });
  });

  it("zeigt eine Fehlermeldung an, wenn das Speichern fehlschlägt", async () => {
    createGiftMock.mockResolvedValue({ error: "Das hat nicht geklappt." });
    render(<QuickAddGiftForm personId="person-1" />);

    fireEvent.change(
      screen.getByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
      { target: { value: "Gartenschere" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /speichern/i }));

    await waitFor(() =>
      expect(screen.getByText("Das hat nicht geklappt.")).not.toBeNull(),
    );
  });
});
