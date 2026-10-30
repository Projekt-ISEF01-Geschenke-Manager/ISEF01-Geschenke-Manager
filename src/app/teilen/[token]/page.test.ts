import { describe, it, expect, vi, beforeEach } from "vitest";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

const linkSingleMock = vi.fn();
const giftsOrderMock = vi.fn();
const getUserByIdMock = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    auth: { admin: { getUserById: getUserByIdMock } },
    from: (table: string) => {
      if (table === "shared_links") {
        return { select: () => ({ eq: () => ({ single: linkSingleMock }) }) };
      }
      if (table === "gifts") {
        return { select: () => ({ in: () => ({ order: giftsOrderMock }) }) };
      }
      throw new Error(`Unerwartete Tabelle in Test: ${table}`);
    },
  }),
}));

const { default: SharedViewPage } = await import("./page");

function params(token: string) {
  return Promise.resolve({ token });
}

describe("SharedViewPage", () => {
  beforeEach(() => {
    linkSingleMock.mockReset();
    giftsOrderMock.mockReset();
    getUserByIdMock.mockReset();
    notFoundMock.mockClear();
  });

  it("gibt 404 zurück für einen ungültigen oder widerrufenen Token", async () => {
    linkSingleMock.mockResolvedValue({ data: null, error: { message: "not found" } });

    await expect(SharedViewPage({ params: params("unbekannt") })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(notFoundMock).toHaveBeenCalled();
    expect(giftsOrderMock).not.toHaveBeenCalled();
  });

  it("gibt 404 zurück, wenn der Link keine Personen (mehr) zeigt", async () => {
    linkSingleMock.mockResolvedValue({
      data: { id: "link-1", user_id: "user-1", shared_link_people: [] },
      error: null,
    });

    await expect(SharedViewPage({ params: params("leer") })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("rendert die freigegebenen Personen mit ihren Ideen, Jahr bleibt verborgen", async () => {
    linkSingleMock.mockResolvedValue({
      data: {
        id: "link-1",
        user_id: "user-1",
        shared_link_people: [
          {
            people: {
              id: "person-1",
              name: "Oma Erna",
              birthday_day: 14,
              birthday_month: 11,
            },
          },
          {
            people: {
              id: "person-2",
              name: "Papa",
              birthday_day: 2,
              birthday_month: 3,
            },
          },
        ],
      },
      error: null,
    });
    giftsOrderMock.mockResolvedValue({
      data: [
        {
          id: "gift-1",
          title: "Kräutergarten-Set",
          link: null,
          status: "idea",
          person_id: "person-1",
          occasions: { name: "Weihnachten" },
        },
        {
          id: "gift-2",
          title: "Hochbeet aus Holz",
          link: null,
          status: "purchased",
          person_id: "person-1",
          occasions: null,
        },
        {
          id: "gift-3",
          title: "Grillzange aus Edelstahl",
          link: null,
          status: "idea",
          person_id: "person-2",
          occasions: null,
        },
      ],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { user_metadata: { full_name: "Adrian" } } },
    });

    const element = await SharedViewPage({ params: params("gueltig") });

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(giftsOrderMock).toHaveBeenCalled();
    expect(element).toBeTruthy();
  });

  it("zeigt einen generischen Namen, wenn kein Vorname gespeichert ist", async () => {
    linkSingleMock.mockResolvedValue({
      data: {
        id: "link-1",
        user_id: "user-1",
        shared_link_people: [
          {
            people: {
              id: "person-1",
              name: "Oma Erna",
              birthday_day: null,
              birthday_month: null,
            },
          },
        ],
      },
      error: null,
    });
    giftsOrderMock.mockResolvedValue({ data: [] });
    getUserByIdMock.mockResolvedValue({ data: { user: { user_metadata: {} } } });

    const element = await SharedViewPage({ params: params("gueltig-ohne-name") });

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(element).toBeTruthy();
  });
});
