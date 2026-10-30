import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => revalidatePathMock(path, type),
}));

const insertLinkSingleMock = vi.fn();
const insertPeopleMock = vi.fn();
const deleteLinkMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "shared_links") {
        return {
          insert: (values: unknown) => ({
            select: () => ({
              single: () => insertLinkSingleMock(values),
            }),
          }),
          delete: () => ({
            eq: (column: string, value: unknown) => deleteLinkMock(column, value),
          }),
        };
      }
      if (table === "shared_link_people") {
        return { insert: (values: unknown) => insertPeopleMock(values) };
      }
      throw new Error(`Unerwartete Tabelle in Test: ${table}`);
    },
  }),
}));

const { createSharedLink, deleteSharedLink } = await import("./shared-links");

function formData(personIds: string[]) {
  const fd = new FormData();
  for (const id of personIds) fd.append("personId", id);
  return fd;
}

describe("createSharedLink", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    insertLinkSingleMock.mockReset();
    insertPeopleMock.mockReset();
    deleteLinkMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("lehnt eine leere Personenauswahl ab", async () => {
    const result = await createSharedLink(undefined, formData([]));
    expect(result?.error).toBe("Bitte wähle mindestens eine Person aus.");
    expect(insertLinkSingleMock).not.toHaveBeenCalled();
  });

  it("gibt einen Fehler zurück, wenn niemand eingeloggt ist", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await createSharedLink(undefined, formData(["person-1"]));
    expect(result?.error).toBe("Bitte melde dich erneut an.");
    expect(insertLinkSingleMock).not.toHaveBeenCalled();
  });

  it("erstellt den Link und ordnet die ausgewählten Personen zu", async () => {
    insertLinkSingleMock.mockResolvedValue({
      data: { id: "link-1", token: "abc-token" },
      error: null,
    });
    insertPeopleMock.mockResolvedValue({ error: null });

    const result = await createSharedLink(
      undefined,
      formData(["person-1", "person-2"]),
    );

    expect(result).toEqual({ token: "abc-token" });
    expect(insertPeopleMock).toHaveBeenCalledWith([
      { shared_link_id: "link-1", person_id: "person-1" },
      { shared_link_id: "link-1", person_id: "person-2" },
    ]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard", "layout");
    expect(deleteLinkMock).not.toHaveBeenCalled();
  });

  it("gibt einen Fehler zurück, wenn das Anlegen des Links fehlschlägt", async () => {
    insertLinkSingleMock.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    });

    const result = await createSharedLink(undefined, formData(["person-1"]));

    expect(result?.error).toBe("db down");
    expect(insertPeopleMock).not.toHaveBeenCalled();
  });

  it("räumt den Link wieder auf, wenn die Personen-Zuordnung fehlschlägt", async () => {
    insertLinkSingleMock.mockResolvedValue({
      data: { id: "link-1", token: "abc-token" },
      error: null,
    });
    insertPeopleMock.mockResolvedValue({ error: { message: "fk violation" } });
    deleteLinkMock.mockResolvedValue({ error: null });

    const result = await createSharedLink(undefined, formData(["person-1"]));

    expect(result?.error).toBe("fk violation");
    expect(deleteLinkMock).toHaveBeenCalledWith("id", "link-1");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("deleteSharedLink", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    deleteLinkMock.mockReset();
  });

  it("löscht den Link über die id und aktualisiert die Übersicht", async () => {
    deleteLinkMock.mockResolvedValue({ error: null });

    const result = await deleteSharedLink("link-1");

    expect(result).toEqual({ success: true });
    expect(deleteLinkMock).toHaveBeenCalledWith("id", "link-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("gibt einen Fehler zurück und aktualisiert die Übersicht NICHT, wenn das Löschen fehlschlägt", async () => {
    deleteLinkMock.mockResolvedValue({ error: { message: "db down" } });

    const result = await deleteSharedLink("link-1");

    expect(result).toEqual({ error: "db down" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
