import { describe, it, expect, vi, beforeEach } from "vitest";

const selectGiftsMock = vi.fn();
const giftsEqMock = vi.fn();
const updateMock = vi.fn();
const updateEqMock = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table !== "gifts") {
        throw new Error(`Unerwartete Tabelle in Test: ${table}`);
      }
      return {
        select: (columns: string) => {
          selectGiftsMock(columns);
          return { eq: (column: string, value: unknown) => giftsEqMock(column, value) };
        },
        update: (values: unknown) => {
          updateMock(values);
          return { eq: (column: string, value: unknown) => updateEqMock(column, value) };
        },
      };
    },
  }),
}));

const { convertPastGifts } = await import("./convert-past-gifts");

function gift(overrides: Record<string, unknown> = {}) {
  return {
    id: "gift-1",
    occasions: { name: "Geburtstag" },
    people: { birthday_day: 14, birthday_month: 11 },
    ...overrides,
  };
}

describe("convertPastGifts", () => {
  beforeEach(() => {
    selectGiftsMock.mockClear();
    giftsEqMock.mockReset();
    updateMock.mockClear();
    updateEqMock.mockReset().mockResolvedValue({ error: null });
  });

  it("stellt ein besorgtes Geburtstagsgeschenk um, wenn der Geburtstag gestern war", async () => {
    giftsEqMock.mockResolvedValue({
      data: [gift({ id: "gift-geburtstag" })],
      error: null,
    });
    const today = new Date(2026, 10, 15); // 15.11.2026, Geburtstag war 14.11.

    await convertPastGifts(today);

    expect(giftsEqMock).toHaveBeenCalledWith("status", "purchased");
    expect(updateMock).toHaveBeenCalledWith({
      status: "given",
      gift_date: "2026-11-14",
    });
    expect(updateEqMock).toHaveBeenCalledWith("id", "gift-geburtstag");
  });

  it("stellt ein besorgtes Weihnachtsgeschenk um, wenn Weihnachten gerade vorbei ist", async () => {
    giftsEqMock.mockResolvedValue({
      data: [
        gift({
          id: "gift-weihnachten",
          occasions: { name: "Weihnachten" },
          people: null,
        }),
      ],
      error: null,
    });
    const today = new Date(2026, 11, 26); // 26.12.2026, Weihnachten (24.12.) war vorgestern

    await convertPastGifts(today);

    expect(updateMock).toHaveBeenCalledWith({
      status: "given",
      gift_date: "2026-12-24",
    });
  });

  it("lässt ein Geburtstagsgeschenk unangetastet, solange der Geburtstag noch nicht war", async () => {
    giftsEqMock.mockResolvedValue({ data: [gift()], error: null });
    const today = new Date(2026, 10, 1); // 01.11.2026, Geburtstag erst am 14.

    await convertPastGifts(today);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("lässt Geschenke mit eigenem Anlass oder ohne Anlass unangetastet", async () => {
    giftsEqMock.mockResolvedValue({
      data: [
        gift({ id: "eigener-anlass", occasions: { name: "Jubiläum" } }),
        gift({ id: "ohne-anlass", occasions: null }),
      ],
      error: null,
    });
    const today = new Date(2026, 10, 15);

    await convertPastGifts(today);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("wirft einen Fehler, wenn die besorgten Geschenke nicht geladen werden können", async () => {
    giftsEqMock.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    });

    await expect(convertPastGifts(new Date(2026, 10, 15))).rejects.toThrow(
      "db down",
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("bricht nicht komplett ab, wenn ein einzelnes Update fehlschlägt, sondern meldet den Fehler am Ende", async () => {
    giftsEqMock.mockResolvedValue({
      data: [gift({ id: "schlaegt-fehl" }), gift({ id: "klappt" })],
      error: null,
    });
    updateEqMock
      .mockResolvedValueOnce({ error: { message: "boom" } })
      .mockResolvedValueOnce({ error: null });

    await expect(convertPastGifts(new Date(2026, 10, 15))).rejects.toThrow(/boom/);
    expect(updateEqMock).toHaveBeenCalledTimes(2);
  });
});
