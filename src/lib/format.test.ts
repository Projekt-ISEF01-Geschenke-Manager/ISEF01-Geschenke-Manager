import { describe, it, expect } from "vitest";
import {
  formatBirthday,
  initials,
  joinWithUnd,
  monthAbbreviation,
} from "./format";

describe("formatBirthday", () => {
  it("gibt null zurück ohne Tag/Monat", () => {
    expect(formatBirthday(null, null, null)).toBeNull();
  });

  it("formatiert ohne Jahr", () => {
    expect(formatBirthday(14, 11, null)).toBe("14. November");
  });

  it("formatiert mit Jahr", () => {
    expect(formatBirthday(14, 11, 1960)).toBe("14. November 1960");
  });
});

describe("joinWithUnd", () => {
  it("gibt einen einzelnen Namen unverändert zurück", () => {
    expect(joinWithUnd(["Oma Erna"])).toBe("Oma Erna");
  });

  it("verbindet zwei Namen mit 'und'", () => {
    expect(joinWithUnd(["Oma Erna", "Papa"])).toBe("Oma Erna und Papa");
  });

  it("verbindet drei oder mehr Namen mit Komma + 'und'", () => {
    expect(joinWithUnd(["Oma Erna", "Papa", "Mama"])).toBe(
      "Oma Erna, Papa und Mama",
    );
  });

  it("gibt einen leeren String für eine leere Liste zurück", () => {
    expect(joinWithUnd([])).toBe("");
  });
});

describe("initials", () => {
  it("nimmt die Anfangsbuchstaben der ersten zwei Wörter", () => {
    expect(initials("Oma Erna")).toBe("OE");
  });

  it("funktioniert mit nur einem Wort", () => {
    expect(initials("Papa")).toBe("P");
  });

  it("ignoriert mehrfache Leerzeichen und weitere Wörter", () => {
    expect(initials("Oma  Erna  Müller")).toBe("OE");
  });
});

describe("monthAbbreviation", () => {
  it("gibt den dreibuchstabigen Monatsnamen zurück", () => {
    expect(monthAbbreviation(11)).toBe("Nov");
    expect(monthAbbreviation(12)).toBe("Dez");
    expect(monthAbbreviation(1)).toBe("Jan");
  });
});
