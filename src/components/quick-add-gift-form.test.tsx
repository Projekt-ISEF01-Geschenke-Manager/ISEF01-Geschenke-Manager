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
  it("zeigt nur ein Titel-Feld, keine Link- oder Anlass-Felder (Z1, A8: Schnelleingabe)", () => {
    render(<QuickAddGiftForm personId="person-1" />);

    expect(
      screen.getByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
    ).not.toBeNull();
    expect(document.querySelector('input[name="link"]')).toBeNull();
    expect(document.querySelector('select[name="occasionId"]')).toBeNull();
  });

  it("übergibt die personId versteckt mit und speichert nur den Titel", async () => {
    createGiftMock.mockResolvedValue({ success: true });
    render(<QuickAddGiftForm personId="person-42" />);

    fireEvent.change(
      screen.getByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
      { target: { value: "Gartenschere" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /speichern/i }));

    await waitFor(() => expect(createGiftMock).toHaveBeenCalled());
    const formData = createGiftMock.mock.calls[0][1] as FormData;
    expect(formData.get("personId")).toBe("person-42");
    expect(formData.get("title")).toBe("Gartenschere");
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
    expect(document.activeElement).toBe(
      screen.getByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
    );
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
