// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SharedGiftItem } from "./shared-gift-item";

const toggleGiftStatusViaSharedLinkMock = vi.fn();
vi.mock("@/app/actions/shared-gifts", () => ({
  toggleGiftStatusViaSharedLink: (...args: unknown[]) =>
    toggleGiftStatusViaSharedLinkMock(...args),
}));

afterEach(() => {
  cleanup();
  toggleGiftStatusViaSharedLinkMock.mockReset();
});

describe("SharedGiftItem", () => {
  it("rendert einen http(s)-Link als klickbares 'Zum Angebot'", () => {
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{
            id: "gift-1",
            title: "Kräutergarten-Set",
            link: "https://shop-beispiel.de/kraeutergarten",
            status: "idea",
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
              id: "gift-1",
              title: "Kräutergarten-Set",
              link: "javascript:alert(1)",
              status: "idea",
              occasion_name: "Weihnachten",
            }}
          />
        </ul>,
      );

      expect(screen.queryByRole("link")).toBeNull();
    },
  );

  it("zeigt den Status als klickbaren Button, der die öffentliche Toggle-Aktion mit Token und Idee aufruft", async () => {
    toggleGiftStatusViaSharedLinkMock.mockResolvedValue({ success: true });
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{
            id: "gift-1",
            title: "Hochbeet aus Holz",
            link: null,
            status: "idea",
            occasion_name: null,
          }}
        />
      </ul>,
    );

    const statusButton = screen.getByRole("button", { name: "offen" });
    fireEvent.click(statusButton);

    await waitFor(() =>
      expect(toggleGiftStatusViaSharedLinkMock).toHaveBeenCalledWith(
        "token-1",
        "gift-1",
        "purchased",
        undefined,
        expect.anything(),
      ),
    );
  });

  it("zeigt den Button als 'besorgt' (umgekehrter Umschalt-Wert), wenn der Status bereits 'purchased' ist", () => {
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{
            id: "gift-1",
            title: "Hochbeet aus Holz",
            link: null,
            status: "purchased",
            occasion_name: null,
          }}
        />
      </ul>,
    );

    expect(screen.getByRole("button", { name: "besorgt" })).not.toBeNull();
  });

  it("zeigt eine Fehlermeldung an, wenn das Umschalten fehlschlägt (z. B. rate-limitiert)", async () => {
    toggleGiftStatusViaSharedLinkMock.mockResolvedValue({
      error: "Zu viele Versuche. Bitte warte 15 Minuten und versuche es erneut.",
    });
    render(
      <ul>
        <SharedGiftItem
          token="token-1"
          gift={{
            id: "gift-1",
            title: "Hochbeet aus Holz",
            link: null,
            status: "idea",
            occasion_name: null,
          }}
        />
      </ul>,
    );

    fireEvent.click(screen.getByRole("button", { name: "offen" }));

    await waitFor(() =>
      expect(screen.getByText(/zu viele versuche/i)).not.toBeNull(),
    );
  });
});
