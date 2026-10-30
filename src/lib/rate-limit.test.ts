import { describe, it, expect, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const eqActionMock = vi.fn();
const eqIdentifierMock = vi.fn();
const gteMock = vi.fn();
const insertMock = vi.fn();
const deleteMock = vi.fn();
const ltMock = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table !== "rate_limit_attempts") {
        throw new Error(`Unerwartete Tabelle in Test: ${table}`);
      }
      return {
        select: (...args: unknown[]) => {
          selectMock(...args);
          return {
            eq: (...eqArgs: unknown[]) => {
              eqActionMock(...eqArgs);
              return {
                eq: (...eqArgs2: unknown[]) => {
                  eqIdentifierMock(...eqArgs2);
                  return { gte: gteMock };
                },
              };
            },
          };
        },
        insert: (...args: unknown[]) => insertMock(...args),
        delete: () => ({
          lt: (...args: unknown[]) => {
            ltMock(...args);
            return deleteMock(...args);
          },
        }),
      };
    },
  }),
}));

const { isRateLimited, recordAttempt } = await import("./rate-limit");

describe("isRateLimited", () => {
  beforeEach(() => {
    selectMock.mockClear();
    eqActionMock.mockClear();
    eqIdentifierMock.mockClear();
    gteMock.mockReset();
  });

  it("ist nicht limitiert, solange weniger als 5 Versuche im Zeitfenster liegen", async () => {
    gteMock.mockResolvedValue({ count: 4 });

    const result = await isRateLimited("login", "Jakob@Example.de");

    expect(result).toBe(false);
    expect(eqActionMock).toHaveBeenCalledWith("action", "login");
    // E-Mail wird klein geschrieben verglichen - Groß-/Kleinschreibung
    // darf das Limit nicht umgehen.
    expect(eqIdentifierMock).toHaveBeenCalledWith(
      "identifier",
      "jakob@example.de",
    );
  });

  it("ist limitiert ab 5 Versuchen im Zeitfenster", async () => {
    gteMock.mockResolvedValue({ count: 5 });

    const result = await isRateLimited("login", "jakob@example.de");

    expect(result).toBe(true);
  });

  it("ist nicht limitiert, wenn count null ist (keine Treffer)", async () => {
    gteMock.mockResolvedValue({ count: null });

    const result = await isRateLimited("register", "jakob@example.de");

    expect(result).toBe(false);
  });
});

describe("recordAttempt", () => {
  beforeEach(() => {
    insertMock.mockClear();
    ltMock.mockClear();
    deleteMock.mockClear().mockResolvedValue({ error: null });
  });

  it("speichert den Versuch klein geschrieben und räumt alte Zeilen auf", async () => {
    await recordAttempt("register", "Jakob@Example.de");

    expect(insertMock).toHaveBeenCalledWith({
      action: "register",
      identifier: "jakob@example.de",
    });
    expect(ltMock).toHaveBeenCalledWith("created_at", expect.any(String));
  });
});
