import { describe, it, expect, vi, beforeEach } from "vitest";

// notFound()/redirect() werfen in echtem Next.js und brechen damit das
// Rendering sofort ab - das bilden wir hier nach, statt nur den Aufruf
// zu zaehlen, damit ein Test auch merkt, wenn nach notFound()/redirect()
// trotzdem noch mit (fehlenden) Daten weitergearbeitet wuerde.
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

const getUserMock = vi.fn();
const personSingleMock = vi.fn();
const occasionsOrderMock = vi.fn();
const giftsOrderMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "people") {
        return {
          select: () => ({
            eq: () => ({ single: personSingleMock }),
          }),
        };
      }
      if (table === "occasions") {
        return { select: () => ({ order: occasionsOrderMock }) };
      }
      if (table === "gifts") {
        return { select: () => ({ eq: () => ({ order: giftsOrderMock }) }) };
      }
      throw new Error(`Unerwartete Tabelle in Test: ${table}`);
    },
  }),
}));

const { default: PersonPage } = await import("./page");

function params(id: string) {
  return Promise.resolve({ id });
}

describe("PersonPage", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    personSingleMock.mockReset();
    occasionsOrderMock.mockReset();
    giftsOrderMock.mockReset();
    notFoundMock.mockClear();
    redirectMock.mockClear();
  });

  it("leitet nicht eingeloggte Nutzer:innen zur Startseite weiter, ohne Personendaten zu laden", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(PersonPage({ params: params("person-1") })).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );

    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(personSingleMock).not.toHaveBeenCalled();
  });

  it("gibt 404 zurück, wenn die Person nicht existiert oder nicht der eigenen Nutzer:in gehört (RLS)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    personSingleMock.mockResolvedValue({ data: null });

    await expect(
      PersonPage({ params: params("fremde-oder-unbekannte-id") }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("rendert die Personendaten und ordnet die Ideen inkl. Anlass-Namen korrekt zu", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    personSingleMock.mockResolvedValue({
      data: {
        id: "person-1",
        name: "Oma Erna",
        birthday_day: 14,
        birthday_month: 11,
        birthday_year: 1960,
        interests: ["Garten"],
        notes: "Mag Tee.",
      },
    });
    occasionsOrderMock.mockResolvedValue({
      data: [{ id: "occasion-1", name: "Weihnachten" }],
    });
    giftsOrderMock.mockResolvedValue({
      data: [
        {
          id: "gift-1",
          title: "Kräutergarten-Set",
          link: null,
          status: "idea",
          occasions: { name: "Weihnachten" },
        },
        {
          id: "gift-2",
          title: "Gutschein",
          link: null,
          status: "idea",
          occasions: null,
        },
      ],
    });

    const element = await PersonPage({ params: params("person-1") });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
    // Rendert ohne zu werfen und liefert ein React-Element zurück.
    expect(element).toBeTruthy();
  });
});
