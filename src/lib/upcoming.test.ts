import { describe, it, expect } from "vitest";
import {
  daysUntilNextOccurrence,
  findRecentOccurrence,
  formatDaysUntil,
} from "./upcoming";

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

describe("findRecentOccurrence", () => {
  it("findet ein Datum von gestern", () => {
    const today = new Date(2026, 10, 15); // 15.11.2026
    const result = findRecentOccurrence(14, 11, today);
    expect(result).toEqual(new Date(2026, 10, 14));
  });

  it("findet ein Datum innerhalb des 3-Tage-Fensters, nicht nur gestern", () => {
    const today = new Date(2026, 10, 16); // 16.11.2026
    const result = findRecentOccurrence(14, 11, today);
    expect(result).toEqual(new Date(2026, 10, 14));
  });

  it("gibt null zurück, wenn das Datum außerhalb des Fensters liegt", () => {
    const today = new Date(2026, 10, 20); // 20.11.2026
    expect(findRecentOccurrence(14, 11, today)).toBeNull();
  });

  it("gibt null zurück für ein Datum in der Zukunft", () => {
    const today = new Date(2026, 10, 10); // 10.11.2026
    expect(findRecentOccurrence(14, 11, today)).toBeNull();
  });

  it("rechnet über einen Jahreswechsel hinweg korrekt (Weihnachten -> Neujahr)", () => {
    const today = new Date(2027, 0, 1); // 01.01.2027
    const result = findRecentOccurrence(24, 12, today, 10);
    expect(result).toEqual(new Date(2026, 11, 24));
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
