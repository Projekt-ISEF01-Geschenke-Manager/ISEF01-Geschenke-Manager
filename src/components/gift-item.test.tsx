// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { GiftItem, type Gift } from "./gift-item";
import { MAX_GIFT_IMAGE_BYTES } from "@/lib/gift-image";

const setGiftStatusMock = vi.fn();
const deleteGiftMock = vi.fn();
const updateGiftMock = vi.fn();
vi.mock("@/app/actions/gifts", () => ({
  setGiftStatus: (...args: unknown[]) => setGiftStatusMock(...args),
  deleteGift: (...args: unknown[]) => deleteGiftMock(...args),
  updateGift: (...args: unknown[]) => updateGiftMock(...args),
}));

// jsdom implementiert <dialog> nur als normales Element, showModal()/close()
// existieren dort nicht einmal als No-op-Stubs - siehe modal.test.tsx bzw.
// dashboard-overview.test.tsx fuer dasselbe Muster.
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
  image_url: null,
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

  it("zeigt den Link gekürzt (nur Hostname) statt der vollen URL", () => {
    render(<GiftItem gift={gift} occasions={occasions} />);

    const link = screen.getByRole("link", { name: /shop-beispiel\.de/i });
    expect(link.textContent).toBe("shop-beispiel.de");
    expect(link.getAttribute("href")).toBe(gift.link);
  });

  it("zeigt den Status als klickbaren Button mit Icon statt als reines Label", () => {
    render(<GiftItem gift={gift} occasions={occasions} />);

    const statusButton = screen.getByRole("button", { name: "Als besorgt markieren" });
    fireEvent.click(statusButton);

    expect(setGiftStatusMock).toHaveBeenCalledWith("gift-1", "purchased");
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

  it("öffnet ein eigenes Bestätigungs-Popup statt sofort zu löschen", () => {
    render(<GiftItem gift={gift} occasions={occasions} />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    expect(showModalMock).toHaveBeenCalledTimes(1);
    expect(deleteGiftMock).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Idee löschen" });
    expect(
      within(dialog).getByText("„Kräutergarten-Set“ wirklich löschen?"),
    ).not.toBeNull();
  });

  it("löscht erst nach Bestätigung im Popup", async () => {
    deleteGiftMock.mockResolvedValue({ success: true });
    render(<GiftItem gift={gift} occasions={occasions} />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    const dialog = screen.getByRole("dialog", { name: "Idee löschen" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Löschen" }));

    await waitFor(() => expect(deleteGiftMock).toHaveBeenCalled());
  });

  it("löscht nicht, wenn das Popup mit Abbrechen geschlossen wird", () => {
    render(<GiftItem gift={gift} occasions={occasions} />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    const dialog = screen.getByRole("dialog", { name: "Idee löschen" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Abbrechen" }));

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(deleteGiftMock).not.toHaveBeenCalled();
  });

  it("zeigt kein 'Als Geschenk übernehmen' mehr - läuft automatisch über den täglichen Cron-Job (#21/#26)", () => {
    render(<GiftItem gift={gift} occasions={occasions} />);

    expect(
      screen.queryByRole("button", { name: "Als Geschenk übernehmen" }),
    ).toBeNull();
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

  it("zeigt ein Vorschaubild statt des Platzhalters, wenn gift.image_url gesetzt ist", () => {
    render(
      <GiftItem
        gift={{ ...gift, image_url: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1" }}
        occasions={occasions}
      />,
    );

    const image = screen.getByRole("img", { name: "Kräutergarten-Set" });
    expect(image.getAttribute("src")).toBe(
      "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
    );
    expect(screen.queryByText("Bild")).toBeNull();
  });

  it("zeigt weiterhin den Platzhalter, wenn kein Bild vorhanden ist", () => {
    render(<GiftItem gift={{ ...gift, image_url: null }} occasions={occasions} />);

    expect(screen.getByText("Bild")).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("nimmt ein ausgewähltes Bild im Datei-Feld des Bearbeiten-Formulars an", async () => {
    // jsdom baut die FormData beim nativen Form-Submit nicht korrekt aus
    // per fireEvent.change gesetzten Dateien zusammen (bekannte Grenze der
    // Testumgebung, kein Verhalten der Komponente) - deshalb wird hier das
    // Datei-Feld selbst geprueft statt der durchgereichten FormData.
    updateGiftMock.mockResolvedValue({ success: true });
    render(<GiftItem gift={{ ...gift, image_url: null }} occasions={occasions} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    const file = new File(["bild-inhalt"], "bild.png", { type: "image/png" });
    const imagePicker = screen.getByLabelText("Bild");
    expect(imagePicker.getAttribute("type")).toBe("file");
    expect(imagePicker.getAttribute("name")).toBe("image");

    fireEvent.change(imagePicker, { target: { files: [file] } });

    const selectedFiles = (imagePicker as unknown as { files: FileList | null }).files;
    expect(selectedFiles?.[0]?.name).toBe("bild.png");
    expect(selectedFiles?.[0]?.type).toBe("image/png");

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(updateGiftMock).toHaveBeenCalled());
  });

  it("lehnt ein zu großes Bild schon im Formular ab, ohne updateGift aufzurufen", () => {
    render(<GiftItem gift={{ ...gift, image_url: null }} occasions={occasions} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    const oversizedFile = new File(
      [new Uint8Array(MAX_GIFT_IMAGE_BYTES + 1)],
      "zu-gross.png",
      { type: "image/png" },
    );
    const imagePicker = screen.getByLabelText("Bild");
    fireEvent.change(imagePicker, { target: { files: [oversizedFile] } });

    expect(screen.getByText("Das Bild darf höchstens 4 MB groß sein.")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(updateGiftMock).not.toHaveBeenCalled();
  });
});
