import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => revalidatePathMock(path, type),
}));

const insertMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const eqMockForUpdate = vi.fn((...args: unknown[]) => updateMock(...args));
const eqMockForDelete = vi.fn((...args: unknown[]) => deleteMock(...args));
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => ({
      insert: (values: unknown) => insertMock(table, values),
      update: (values: unknown) => ({
        eq: (column: string, value: unknown) =>
          eqMockForUpdate(table, values, column, value),
      }),
      delete: () => ({
        eq: (column: string, value: unknown) =>
          eqMockForDelete(table, column, value),
      }),
    }),
  }),
}));

const { createGift, setGiftStatus, deleteGift } = await import("./gifts");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const validFields = {
  personId: "person-1",
  title: "Kräutergarten-Set",
  link: "https://shop-beispiel.de/kraeutergarten",
  occasionId: "occasion-1",
};

describe("createGift", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    insertMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("lehnt eine fehlende Person ab", async () => {
    const result = await createGift(undefined, formData({ ...validFields, personId: "" }));
    expect(result?.error).toBe("Bitte wähle aus, für wen die Idee ist.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("lehnt einen fehlenden Titel ab", async () => {
    const result = await createGift(undefined, formData({ ...validFields, title: "" }));
    expect(result?.error).toBe("Bitte gib einen Titel für die Idee ein.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("lehnt einen unsicheren Link ab (z. B. javascript:)", async () => {
    const result = await createGift(
      undefined,
      formData({ ...validFields, link: "javascript:alert(1)" }),
    );
    expect(result?.error).toBe(
      "Bitte gib einen gültigen Link an (beginnend mit http:// oder https://).",
    );
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("erlaubt eine Idee nur mit Person und Titel (A8: höchstens 2 Pflichtfelder)", async () => {
    insertMock.mockResolvedValue({ error: null });
    const result = await createGift(
      undefined,
      formData({ personId: "person-1", title: "Gutschein", link: "", occasionId: "" }),
    );
    expect(result).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith(
      "gifts",
      expect.objectContaining({ link: null, occasion_id: null }),
    );
  });

  it("legt die Idee für die eingeloggte Nutzer:in an und gibt einen vom Ausgangszustand unterscheidbaren Erfolg zurück", async () => {
    insertMock.mockResolvedValue({ error: null });
    const result = await createGift(undefined, formData(validFields));

    expect(result).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith("gifts", {
      user_id: "user-1",
      person_id: "person-1",
      occasion_id: "occasion-1",
      title: "Kräutergarten-Set",
      link: "https://shop-beispiel.de/kraeutergarten",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("gibt einen Fehler zurück, wenn niemand eingeloggt ist", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await createGift(undefined, formData(validFields));
    expect(result?.error).toBe("Bitte melde dich erneut an.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("gibt einen Supabase-Fehler weiter, statt die Übersicht zu aktualisieren", async () => {
    insertMock.mockResolvedValue({ error: { message: "db down" } });
    const result = await createGift(undefined, formData(validFields));
    expect(result?.error).toBe("db down");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("setGiftStatus", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    updateMock.mockReset();
  });

  it("setzt den Status auf 'purchased'", async () => {
    updateMock.mockResolvedValue({ error: null });
    await setGiftStatus("gift-1", "purchased");
    expect(updateMock).toHaveBeenCalledWith(
      "gifts",
      { status: "purchased" },
      "id",
      "gift-1",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("lehnt einen ungültigen Status ab, ohne die Datenbank anzufassen", async () => {
    await expect(
      // @ts-expect-error -- bewusst ungültiger Wert für den Test
      setGiftStatus("gift-1", "given"),
    ).rejects.toThrow("Ungültiger Status");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("wirft bei einem Supabase-Fehler", async () => {
    updateMock.mockResolvedValue({ error: { message: "db down" } });
    await expect(setGiftStatus("gift-1", "idea")).rejects.toThrow("db down");
  });
});

describe("deleteGift", () => {
  it("löscht über die id und aktualisiert die Übersicht", async () => {
    revalidatePathMock.mockClear();
    deleteMock.mockReset().mockResolvedValue({ error: null });

    const result = await deleteGift("gift-1");

    expect(result).toEqual({ success: true });
    expect(deleteMock).toHaveBeenCalledWith("gifts", "id", "gift-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("gibt einen Fehler zurück und aktualisiert die Übersicht NICHT, wenn das Löschen fehlschlägt", async () => {
    revalidatePathMock.mockClear();
    deleteMock.mockReset().mockResolvedValue({ error: { message: "db down" } });

    const result = await deleteGift("gift-1");

    expect(result).toEqual({ error: "db down" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
