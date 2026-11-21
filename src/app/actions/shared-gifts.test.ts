import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePathMock(path),
}));

const checkAndRecordAttemptMock = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkAndRecordAttempt: (...args: unknown[]) =>
    checkAndRecordAttemptMock(...args),
  RATE_LIMIT_MESSAGE: "Zu viele Versuche. Bitte warte 15 Minuten und versuche es erneut.",
}));

const linkSelectMock = vi.fn();
const linkSingleMock = vi.fn();
const giftSelectMock = vi.fn();
const giftSingleMock = vi.fn();
const giftUpdateMock = vi.fn();
const giftUpdateEqMock = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === "shared_links") {
        return {
          select: (columns: string) => {
            linkSelectMock(columns);
            return { eq: () => ({ single: linkSingleMock }) };
          },
        };
      }
      if (table === "gifts") {
        return {
          select: (columns: string) => {
            giftSelectMock(columns);
            return { eq: () => ({ single: giftSingleMock }) };
          },
          update: (values: unknown) => {
            giftUpdateMock(values);
            return {
              eq: (column: string, value: unknown) =>
                giftUpdateEqMock(column, value),
            };
          },
        };
      }
      throw new Error(`Unerwartete Tabelle in Test: ${table}`);
    },
  }),
}));

const { toggleGiftStatusViaSharedLink } = await import("./shared-gifts");

describe("toggleGiftStatusViaSharedLink", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    checkAndRecordAttemptMock.mockReset();
    checkAndRecordAttemptMock.mockResolvedValue({
      limited: false,
      attemptId: "attempt-1",
    });
    linkSelectMock.mockClear();
    linkSingleMock.mockReset();
    giftSelectMock.mockClear();
    giftSingleMock.mockReset();
    giftUpdateMock.mockClear();
    giftUpdateEqMock.mockReset();
  });

  it("lehnt einen ungültigen Status ab", async () => {
    const result = await toggleGiftStatusViaSharedLink(
      "token-1",
      "gift-1",
      // @ts-expect-error - absichtlich ein ungültiger Wert für den Test
      "given",
    );

    expect(result).toEqual({ error: "Ungültiger Status." });
    expect(checkAndRecordAttemptMock).not.toHaveBeenCalled();
  });

  it("ist rate-limitiert nach zu vielen Versuchen für denselben Token", async () => {
    checkAndRecordAttemptMock.mockResolvedValue({
      limited: true,
      attemptId: null,
    });

    const result = await toggleGiftStatusViaSharedLink(
      "token-1",
      "gift-1",
      "purchased",
    );

    expect(result?.error).toMatch(/zu viele versuche/i);
    expect(checkAndRecordAttemptMock).toHaveBeenCalledWith(
      "shared-status-toggle",
      "token-1",
      { maxAttempts: 30 },
    );
    expect(linkSelectMock).not.toHaveBeenCalled();
  });

  it("gibt einen Fehler zurück, wenn der Link nicht (mehr) existiert", async () => {
    linkSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await toggleGiftStatusViaSharedLink(
      "token-unbekannt",
      "gift-1",
      "purchased",
    );

    expect(result?.error).toMatch(/nicht mehr gültig/i);
    expect(giftUpdateMock).not.toHaveBeenCalled();
  });

  it("lehnt eine Idee ab, die nicht zu den über den Token freigegebenen Personen gehört", async () => {
    linkSingleMock.mockResolvedValue({
      data: { shared_link_people: [{ person_id: "person-1" }] },
      error: null,
    });
    giftSingleMock.mockResolvedValue({
      data: { id: "gift-1", person_id: "person-fremd" },
      error: null,
    });

    const result = await toggleGiftStatusViaSharedLink(
      "token-1",
      "gift-1",
      "purchased",
    );

    expect(result?.error).toMatch(/gehört nicht zu diesem geteilten link/i);
    expect(giftUpdateMock).not.toHaveBeenCalled();
  });

  it("schaltet den Status um, wenn die Idee zu einer freigegebenen Person gehört", async () => {
    linkSelectMock.mockClear();
    linkSingleMock.mockResolvedValue({
      data: { shared_link_people: [{ person_id: "person-1" }] },
      error: null,
    });
    giftSingleMock.mockResolvedValue({
      data: { id: "gift-1", person_id: "person-1" },
      error: null,
    });
    giftUpdateEqMock.mockResolvedValue({ error: null });

    const result = await toggleGiftStatusViaSharedLink(
      "token-1",
      "gift-1",
      "purchased",
    );

    expect(result).toEqual({ success: true });
    expect(giftUpdateMock).toHaveBeenCalledWith({ status: "purchased" });
    expect(giftUpdateEqMock).toHaveBeenCalledWith("id", "gift-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/teilen/token-1");
  });

  it("gibt einen Fehler zurück, wenn das Update fehlschlägt", async () => {
    linkSingleMock.mockResolvedValue({
      data: { shared_link_people: [{ person_id: "person-1" }] },
      error: null,
    });
    giftSingleMock.mockResolvedValue({
      data: { id: "gift-1", person_id: "person-1" },
      error: null,
    });
    giftUpdateEqMock.mockResolvedValue({ error: { message: "db down" } });

    const result = await toggleGiftStatusViaSharedLink(
      "token-1",
      "gift-1",
      "purchased",
    );

    expect(result).toEqual({ error: "db down" });
  });
});
