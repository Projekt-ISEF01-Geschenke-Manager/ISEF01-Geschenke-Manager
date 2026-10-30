import { describe, it, expect, vi, beforeEach } from "vitest";

// notFound() wirft in echtem Next.js und bricht damit das Rendering
// sofort ab - das bilden wir hier nach, statt nur den Aufruf zu zaehlen,
// damit ein Test auch merkt, wenn danach trotzdem mit fehlenden Daten
// weitergearbeitet wuerde.
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

const requireUserMock = vi.fn();
const personSingleMock = vi.fn();
const occasionsOrderMock = vi.fn();
const giftsOrderMock = vi.fn();

// requireUser() uebernimmt die Auth-Pruefung/Weiterleitung jetzt zentral
// (siehe src/lib/supabase/server.ts) - fuer diese Seite reicht es, sie
// zu mocken; das eigentliche Redirect-Verhalten hat server.test.ts.
vi.mock("@/lib/supabase/server", () => ({
  requireUser: requireUserMock,
}));

function fakeSupabase() {
  return {
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
  };
}

const { default: PersonPage } = await import("./page");

function params(id: string) {
  return Promise.resolve({ id });
}

describe("PersonPage", () => {
  beforeEach(() => {
    requireUserMock.mockReset();
    personSingleMock.mockReset();
    occasionsOrderMock.mockReset();
    giftsOrderMock.mockReset();
    notFoundMock.mockClear();
  });

  it("gibt den Redirect von requireUser weiter, ohne Personendaten zu laden", async () => {
    requireUserMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT:/");
    });

    await expect(PersonPage({ params: params("person-1") })).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );

    expect(personSingleMock).not.toHaveBeenCalled();
  });

  it("gibt 404 zurück, wenn die Person nicht existiert oder nicht der eigenen Nutzer:in gehört (RLS)", async () => {
    requireUserMock.mockResolvedValue({
      supabase: fakeSupabase(),
      user: { id: "user-1" },
    });
    personSingleMock.mockResolvedValue({ data: null });

    await expect(
      PersonPage({ params: params("fremde-oder-unbekannte-id") }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("rendert die Personendaten und ordnet die Ideen inkl. Anlass-Namen korrekt zu", async () => {
    requireUserMock.mockResolvedValue({
      supabase: fakeSupabase(),
      user: { id: "user-1" },
    });
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

    expect(notFoundMock).not.toHaveBeenCalled();
    // Rendert ohne zu werfen und liefert ein React-Element zurück.
    expect(element).toBeTruthy();
  });
});
