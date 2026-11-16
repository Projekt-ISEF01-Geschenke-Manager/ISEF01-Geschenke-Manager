// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GiftItem, type Gift } from "./gift-item";

const setGiftStatusMock = vi.fn();
const deleteGiftMock = vi.fn();
const updateGiftMock = vi.fn();
vi.mock("@/app/actions/gifts", () => ({
  setGiftStatus: (...args: unknown[]) => setGiftStatusMock(...args),
  deleteGift: (...args: unknown[]) => deleteGiftMock(...args),
  updateGift: (...args: unknown[]) => updateGiftMock(...args),
}));

afterEach(() => {
  cleanup();
  setGiftStatusMock.mockReset();
  deleteGiftMock.mockReset();
  updateGiftMock.mockReset();
});

const occasions = [
  { id: "occasion-1", name: "Weihnachten" },
  { id: "occasion-2", name: "Geburtstag" },
];

const gift: Gift = {
  id: "gift-1",
  title: "Kräutergarten-Set",
  link: "https://shop-beispiel.de/kraeutergarten",
  status: "idea",
  occasion_id: "occasion-1",
  occasion_name: "Weihnachten",
};

describe("GiftItem – Bearbeiten (Issue #154)", () => {
  it("zeigt im Lesemodus Titel und Link, aber kein Formular", () => {
    render(<GiftItem gift={gift} occasions={occasions} />);

    expect(screen.getByText("Kräutergarten-Set")).not.toBeNull();
    expect(screen.queryByDisplayValue("Kräutergarten-Set")).toBeNull();
  });

  it("öffnet beim Klick auf Bearbeiten ein vorausgefülltes Formular", () => {
    render(<GiftItem gift={gift} occasions={occasions} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(screen.getByDisplayValue("Kräutergarten-Set")).not.toBeNull();
    expect(
      screen.getByDisplayValue("https://shop-beispiel.de/kraeutergarten"),
    ).not.toBeNull();
    expect(
      screen.getByRole("option", { name: "Weihnachten" }).parentElement,
    ).not.toBeNull();
  });

  it("bricht die Bearbeitung ohne Speichern ab", () => {
    render(<GiftItem gift={gift} occasions={occasions} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(updateGiftMock).not.toHaveBeenCalled();
    expect(screen.getByText("Kräutergarten-Set")).not.toBeNull();
    expect(screen.queryByDisplayValue("Kräutergarten-Set")).toBeNull();
  });

  it("speichert die Änderung über die an die gift-id gebundene updateGift-Action", async () => {
    updateGiftMock.mockResolvedValue({ success: true });
    render(<GiftItem gift={gift} occasions={occasions} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(updateGiftMock).toHaveBeenCalledWith(
        "gift-1",
        expect.anything(),
        expect.anything(),
      ),
    );
    // Formular klappt nach erfolgreichem Speichern wieder ein.
    await waitFor(() =>
      expect(screen.queryByDisplayValue("Kräutergarten-Set")).toBeNull(),
    );
  });

  it("zeigt einen Fehler an und bleibt im Bearbeiten-Modus, wenn das Speichern fehlschlägt", async () => {
    updateGiftMock.mockResolvedValue({
      error: "db down",
      values: {
        personId: "",
        title: "Kräutergarten-Set",
        link: gift.link ?? "",
        occasionId: gift.occasion_id ?? "",
      },
    });
    render(<GiftItem gift={gift} occasions={occasions} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(screen.getByText("db down")).not.toBeNull());
    expect(screen.getByDisplayValue("Kräutergarten-Set")).not.toBeNull();
  });
});
