import { describe, it, expect } from "vitest";
import { daysUntilNextOccurrence, formatDaysUntil } from "./upcoming";

describe("daysUntilNextOccurrence", () => {
  it("berechnet die Tage bis zu einem Datum später in diesem Jahr", () => {
    const from = new Date(2026, 9, 26); // 26.10.2026
    expect(daysUntilNextOccurrence(14, 11, from)).toBe(19);
  });

  it("gibt 0 zurück, wenn das Datum heute ist", () => {
    const from = new Date(2026, 9, 26);
    expect(daysUntilNextOccurrence(26, 10, from)).toBe(0);
  });

  it("springt ins nächste Jahr, wenn der Tag dieses Jahr schon vorbei ist", () => {
    const from = new Date(2026, 9, 26); // 26.10.2026
    // 1. Januar lag dieses Jahr schon in der Vergangenheit.
    expect(daysUntilNextOccurrence(1, 1, from)).toBe(67);
  });

  it("rechnet über einen Jahreswechsel hinweg korrekt (Weihnachten)", () => {
    const from = new Date(2026, 9, 26); // 26.10.2026
    expect(daysUntilNextOccurrence(24, 12, from)).toBe(59);
  });
});

describe("formatDaysUntil", () => {
  it("formatiert 0 als 'heute'", () => {
    expect(formatDaysUntil(0)).toBe("heute");
  });

  it("formatiert 1 als 'morgen'", () => {
    expect(formatDaysUntil(1)).toBe("morgen");
  });

  it("formatiert mehrere Tage als 'in N Tagen'", () => {
    expect(formatDaysUntil(19)).toBe("in 19 Tagen");
  });
});
