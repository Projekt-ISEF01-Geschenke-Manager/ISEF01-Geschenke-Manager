import { describe, it, expect } from "vitest";
import { isValidHttpUrl, shortLink } from "./url";

describe("isValidHttpUrl", () => {
  it("akzeptiert http(s)-Links", () => {
    expect(isValidHttpUrl("https://shop-beispiel.de/kraeutergarten")).toBe(
      true,
    );
    expect(isValidHttpUrl("http://shop-beispiel.de")).toBe(true);
  });

  it("lehnt andere Protokolle und ungueltige Werte ab", () => {
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("nicht-ein-link")).toBe(false);
  });
});

describe("shortLink", () => {
  it("zeigt nur den Hostnamen ohne www. und Pfad", () => {
    expect(shortLink("https://shop-beispiel.de/kraeutergarten?x=1")).toBe(
      "shop-beispiel.de",
    );
    expect(shortLink("https://www.baumarkt-beispiel.de/hochbeet")).toBe(
      "baumarkt-beispiel.de",
    );
  });

  it("faellt bei nicht parsbaren Werten auf das Protokoll-Entfernen zurueck", () => {
    expect(shortLink("nicht-ein-link")).toBe("nicht-ein-link");
  });
});
