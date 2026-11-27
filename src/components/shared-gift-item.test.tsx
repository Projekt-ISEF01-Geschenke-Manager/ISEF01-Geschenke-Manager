// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { SharedGiftItem } from "./shared-gift-item";

const toggleGiftStatusViaSharedLinkMock = vi.fn();
vi.mock("@/app/actions/shared-gifts", () => ({
  toggleGiftStatusViaSharedLink: (...args: unknown[]) =>
    toggleGiftStatusViaSharedLinkMock(...args),
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
  toggleGiftStatusViaSharedLinkMock.mockReset();
});

const offeneIdee = {
  id: "gift-1",
  title: "Hochbeet aus Holz",
  link: null,
  image_url: null,
  link_preview_url: null,
  status: "idea",
  purchased_by: null,
  occasion_name: null,
};

describe("SharedGiftItem", () => {
  it("rendert einen http(s)-Link als klickbares 'Zum Angebot'", () => {
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{
            ...offeneIdee,
            title: "Kräutergarten-Set",
            link: "https://shop-beispiel.de/kraeutergarten",
            occasion_name: "Weihnachten",
          }}
        />
      </ul>,
    );

    const link = screen.getByRole("link", { name: /zum angebot/i });
    expect(link.getAttribute("href")).toBe(
      "https://shop-beispiel.de/kraeutergarten",
    );
  });

  it(
    "rendert keinen Link bei einem unsicheren Schema (defense in depth " +
      "gegen XSS, falls der Wert nicht ueber createGift validiert wurde)",
    () => {
      render(
        <ul>
          <SharedGiftItem
            token="token-1"
            gift={{
              ...offeneIdee,
              title: "Kräutergarten-Set",
              link: "javascript:alert(1)",
              occasion_name: "Weihnachten",
            }}
          />
        </ul>,
      );

      expect(screen.queryByRole("link")).toBeNull();
    },
  );

  it("öffnet beim Klick auf 'offen' ein Popup zur Namensangabe, statt direkt umzuschalten", () => {
    render(
      <ul>
        <SharedGiftItem token="token-1" gift={offeneIdee} />
      </ul>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Als besorgt markieren" }));

    expect(showModalMock).toHaveBeenCalledTimes(1);
    expect(toggleGiftStatusViaSharedLinkMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Als besorgt markieren" }),
    ).not.toBeNull();
  });

  it("markiert als besorgt mit dem im Popup eingegebenen Namen", async () => {
    toggleGiftStatusViaSharedLinkMock.mockResolvedValue({ success: true });
    render(
      <ul>
        <SharedGiftItem token="token-1" gift={offeneIdee} />
      </ul>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Als besorgt markieren" }));
    const dialog = screen.getByRole("dialog", { name: "Als besorgt markieren" });
    fireEvent.change(within(dialog).getByPlaceholderText("z. B. Max"), {
      target: { value: "Max" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Als besorgt markieren" }),
    );

    await waitFor(() => expect(toggleGiftStatusViaSharedLinkMock).toHaveBeenCalled());
    const call = toggleGiftStatusViaSharedLinkMock.mock.calls[0];
    expect(call[0]).toBe("token-1");
    expect(call[1]).toBe("gift-1");
    expect(call[2]).toBe("purchased");
    const formData = call[4] as FormData;
    expect(formData.get("purchasedBy")).toBe("Max");
  });

  it("schließt das Popup nach erfolgreichem Markieren wieder", async () => {
    toggleGiftStatusViaSharedLinkMock.mockResolvedValue({ success: true });
    render(
      <ul>
        <SharedGiftItem token="token-1" gift={offeneIdee} />
      </ul>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Als besorgt markieren" }));
    const dialog = screen.getByRole("dialog", { name: "Als besorgt markieren" });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Als besorgt markieren" }),
    );

    await waitFor(() => expect(closeMock).toHaveBeenCalledTimes(1));
  });

  it("zeigt eine Fehlermeldung im Popup an, wenn das Markieren fehlschlägt (z. B. rate-limitiert)", async () => {
    toggleGiftStatusViaSharedLinkMock.mockResolvedValue({
      error: "Zu viele Versuche. Bitte warte 15 Minuten und versuche es erneut.",
    });
    render(
      <ul>
        <SharedGiftItem token="token-1" gift={offeneIdee} />
      </ul>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Als besorgt markieren" }));
    const dialog = screen.getByRole("dialog", { name: "Als besorgt markieren" });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Als besorgt markieren" }),
    );

    await waitFor(() =>
      expect(within(dialog).getByText(/zu viele versuche/i)).not.toBeNull(),
    );
    // Popup bleibt bei einem Fehler offen, damit man es nochmal versuchen kann.
    expect(closeMock).not.toHaveBeenCalled();
  });

  it("schaltet bereits besorgte Ideen direkt auf 'offen' zurück, ohne Popup", async () => {
    toggleGiftStatusViaSharedLinkMock.mockResolvedValue({ success: true });
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{ ...offeneIdee, status: "purchased" }}
        />
      </ul>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Besorgt" }));

    expect(showModalMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(toggleGiftStatusViaSharedLinkMock).toHaveBeenCalledWith(
        "token-1",
        "gift-1",
        "idea",
        undefined,
        expect.anything(),
      ),
    );
  });

  it("zeigt an, wer die Idee schon besorgt hat", () => {
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{ ...offeneIdee, status: "purchased", purchased_by: "Max" }}
        />
      </ul>,
    );

    expect(screen.getByText("Max hat das schon besorgt.")).not.toBeNull();
  });

  it("zeigt keinen Namenshinweis, wenn besorgt ohne Namensangabe markiert wurde", () => {
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{ ...offeneIdee, status: "purchased", purchased_by: null }}
        />
      </ul>,
    );

    expect(screen.queryByText(/hat das schon besorgt/i)).toBeNull();
  });

  it("zeigt ein Vorschaubild statt des Platzhalters, wenn gift.image_url gesetzt ist", () => {
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{
            ...offeneIdee,
            image_url: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
          }}
        />
      </ul>,
    );

    const image = screen.getByRole("img", { name: "Hochbeet aus Holz" });
    expect(image.getAttribute("src")).toBe(
      "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
    );
  });

  it("zeigt weiterhin den Platzhalter, wenn kein Bild vorhanden ist", () => {
    render(
      <ul>
        <SharedGiftItem token="token-1" gift={{ ...offeneIdee, image_url: null }} />
      </ul>,
    );

    expect(screen.getByText("Bild")).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("zeigt die automatische Link-Vorschau, wenn kein eigenes Bild hochgeladen wurde", () => {
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{
            ...offeneIdee,
            image_url: null,
            link_preview_url: "https://cdn.example/vorschau.png",
          }}
        />
      </ul>,
    );

    const image = screen.getByRole("img", { name: "Hochbeet aus Holz" });
    expect(image.getAttribute("src")).toBe("https://cdn.example/vorschau.png");
  });

  it("zeigt das eigene Bild statt der Link-Vorschau, wenn beides vorhanden ist", () => {
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{
            ...offeneIdee,
            image_url: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
            link_preview_url: "https://cdn.example/vorschau.png",
          }}
        />
      </ul>,
    );

    const image = screen.getByRole("img", { name: "Hochbeet aus Holz" });
    expect(image.getAttribute("src")).toBe(
      "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
    );
  });
});
