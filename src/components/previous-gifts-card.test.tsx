// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PreviousGiftsCard } from "./previous-gifts-card";

const addPastGiftMock = vi.fn();
vi.mock("@/app/actions/gifts", () => ({
  addPastGift: (...args: unknown[]) => addPastGiftMock(...args),
}));

// jsdom implementiert <dialog> nur als normales Element, showModal()/close()
// existieren dort nicht einmal als No-op-Stubs - siehe modal.test.tsx bzw.
// gift-item.test.tsx fuer dasselbe Muster.
let showModalMock: ReturnType<typeof vi.fn<() => void>>;
let closeMock: ReturnType<typeof vi.fn<(returnValue?: string) => void>>;

beforeEach(() => {
  showModalMock = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  closeMock = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  HTMLDialogElement.prototype.showModal = showModalMock;
  HTMLDialogElement.prototype.close = closeMock;
});

afterEach(() => {
  cleanup();
  // @ts-expect-error - jsdom kennt showModal()/close() nativ nicht, Stubs entfernen
  delete HTMLDialogElement.prototype.showModal;
  // @ts-expect-error - siehe oben
  delete HTMLDialogElement.prototype.close;
  addPastGiftMock.mockReset();
});

const occasions = [
  { id: "occasion-1", name: "Weihnachten" },
  { id: "occasion-2", name: "Geburtstag" },
];

describe("PreviousGiftsCard", () => {
  it("zeigt einen Hinweis, wenn es noch keine früheren Geschenke gibt", () => {
    render(
      <PreviousGiftsCard
        personId="person-1"
        personName="Oma Erna"
        occasions={occasions}
        gifts={[]}
      />,
    );

    expect(
      screen.getByText("Noch keine früheren Geschenke für Oma Erna."),
    ).not.toBeNull();
  });

  it("zeigt Titel, Anlass, Datum und optionale Beschreibung je Geschenk", () => {
    render(
      <PreviousGiftsCard
        personId="person-1"
        personName="Oma Erna"
        occasions={occasions}
        gifts={[
          {
            id: "gift-1",
            title: "Kräutergarten-Set",
            description: "Hat sich sehr gefreut.",
            occasion_name: "Weihnachten",
            gift_date: "2025-12-24",
          },
          {
            id: "gift-2",
            title: "Gutschein Gärtnerei",
            description: null,
            occasion_name: null,
            gift_date: "2026-11-14",
          },
        ]}
      />,
    );

    expect(screen.getByText("Kräutergarten-Set")).not.toBeNull();
    expect(
      screen.getByText("Weihnachten · 24. Dezember 2025"),
    ).not.toBeNull();
    expect(screen.getByText("Hat sich sehr gefreut.")).not.toBeNull();

    expect(screen.getByText("Gutschein Gärtnerei")).not.toBeNull();
    expect(screen.getByText("ohne Anlass · 14. November 2026")).not.toBeNull();
  });

  it("öffnet beim Klick auf '+ Geschenk nachtragen' ein Popup mit Titel/Anlass/Datum/Notiz", () => {
    render(
      <PreviousGiftsCard
        personId="person-1"
        personName="Oma Erna"
        occasions={occasions}
        gifts={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Geschenk nachtragen" }));

    expect(showModalMock).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole("dialog", { name: "Geschenk nachtragen" });
    expect(within(dialog).getByLabelText("Titel")).not.toBeNull();
    expect(
      within(dialog).getByRole("option", { name: "Geburtstag" }).parentElement,
    ).not.toBeNull();
  });

  it("legt das Geschenk mit den Popup-Daten für die übergebene Person an", async () => {
    addPastGiftMock.mockResolvedValue({ success: true });
    render(
      <PreviousGiftsCard
        personId="person-1"
        personName="Oma Erna"
        occasions={occasions}
        gifts={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Geschenk nachtragen" }));
    const dialog = screen.getByRole("dialog", { name: "Geschenk nachtragen" });
    fireEvent.change(within(dialog).getByLabelText("Titel"), {
      target: { value: "Wärmflasche mit Strickbezug" },
    });
    fireEvent.change(within(dialog).getByLabelText("Datum"), {
      target: { value: "2024-12-24" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Hinzufügen" }));

    await waitFor(() => expect(addPastGiftMock).toHaveBeenCalled());
    const call = addPastGiftMock.mock.calls[0];
    expect(call[0]).toBe("person-1");
    const formData = call[2] as FormData;
    expect(formData.get("title")).toBe("Wärmflasche mit Strickbezug");
    expect(formData.get("giftDate")).toBe("2024-12-24");
  });

  it("schließt das Popup nach erfolgreichem Anlegen wieder", async () => {
    addPastGiftMock.mockResolvedValue({ success: true });
    render(
      <PreviousGiftsCard
        personId="person-1"
        personName="Oma Erna"
        occasions={occasions}
        gifts={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Geschenk nachtragen" }));
    const dialog = screen.getByRole("dialog", { name: "Geschenk nachtragen" });
    fireEvent.change(within(dialog).getByLabelText("Titel"), {
      target: { value: "Gutschein" },
    });
    fireEvent.change(within(dialog).getByLabelText("Datum"), {
      target: { value: "2024-12-24" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Hinzufügen" }));

    await waitFor(() => expect(closeMock).toHaveBeenCalledTimes(1));
  });

  it("zeigt einen Fehler im Popup an, wenn das Anlegen fehlschlägt", async () => {
    addPastGiftMock.mockResolvedValue({ error: "db down" });
    render(
      <PreviousGiftsCard
        personId="person-1"
        personName="Oma Erna"
        occasions={occasions}
        gifts={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Geschenk nachtragen" }));
    const dialog = screen.getByRole("dialog", { name: "Geschenk nachtragen" });
    fireEvent.change(within(dialog).getByLabelText("Titel"), {
      target: { value: "Gutschein" },
    });
    // Datum ist im UI "required" (Browser-Validierung) - fuer einen
    // Server-Fehler trotzdem einen gueltigen Wert setzen, sonst sendet der
    // Browser das Formular gar nicht erst ab.
    fireEvent.change(within(dialog).getByLabelText("Datum"), {
      target: { value: "2024-12-24" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Hinzufügen" }));

    await waitFor(() =>
      expect(within(dialog).getByText("db down")).not.toBeNull(),
    );
    expect(closeMock).not.toHaveBeenCalled();
  });
});
