// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SharedGiftItem } from "./shared-gift-item";

afterEach(() => {
  cleanup();
});

describe("SharedGiftItem", () => {
  it("rendert einen http(s)-Link als klickbares 'Zum Angebot'", () => {
    render(
      <ul>
        <SharedGiftItem
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

  it("zeigt 'schon besorgt' nur bei status 'purchased'", () => {
    render(
      <ul>
        <SharedGiftItem
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

    expect(screen.getByText("schon besorgt")).not.toBeNull();
  });
});
