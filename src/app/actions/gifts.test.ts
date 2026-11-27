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
const uploadStorageMock = vi.fn();
const removeStorageMock = vi.fn();
const getPublicUrlMock = vi.fn();

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
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, file: unknown, opts: unknown) =>
          uploadStorageMock(bucket, path, file, opts),
        remove: (paths: string[]) => removeStorageMock(bucket, paths),
        getPublicUrl: (path: string) => getPublicUrlMock(bucket, path),
      }),
    },
  }),
}));

const { createGift, updateGift, setGiftStatus, deleteGift, addPastGift } =
  await import("./gifts");

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

function makeImageFile(bytes: number, type = "image/png", name = "bild.png") {
  return new File([new Uint8Array(bytes)], name, { type });
}

function formDataWithImage(fields: Record<string, string>, image: File) {
  const fd = formData(fields);
  fd.set("image", image);
  return fd;
}

describe("updateGift", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    updateMock.mockReset();
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } } });
    uploadStorageMock.mockReset().mockResolvedValue({ data: {}, error: null });
    getPublicUrlMock.mockReset().mockReturnValue({
      data: {
        publicUrl: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
      },
    });
  });

  it("lehnt einen fehlenden Titel ab, ohne die Datenbank anzufassen", async () => {
    const result = await updateGift(
      "gift-1",
      undefined,
      formData({ ...validFields, title: "" }),
    );
    expect(result?.error).toBe("Bitte gib einen Titel für die Idee ein.");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("lehnt einen unsicheren Link ab (z. B. javascript:)", async () => {
    const result = await updateGift(
      "gift-1",
      undefined,
      formData({ ...validFields, link: "javascript:alert(1)" }),
    );
    expect(result?.error).toBe(
      "Bitte gib einen gültigen Link an (beginnend mit http:// oder https://).",
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("aktualisiert Titel, Link und Anlass der bestehenden Idee", async () => {
    updateMock.mockResolvedValue({ error: null });
    const result = await updateGift("gift-1", undefined, formData(validFields));

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith(
      "gifts",
      {
        title: "Kräutergarten-Set",
        link: "https://shop-beispiel.de/kraeutergarten",
        occasion_id: "occasion-1",
      },
      "id",
      "gift-1",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("erlaubt das Entfernen von Link und Anlass (nur Titel bleibt Pflicht)", async () => {
    updateMock.mockResolvedValue({ error: null });
    const result = await updateGift(
      "gift-1",
      undefined,
      formData({ personId: "person-1", title: "Gutschein", link: "", occasionId: "" }),
    );
    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith(
      "gifts",
      { title: "Gutschein", link: null, occasion_id: null },
      "id",
      "gift-1",
    );
  });

  it("gibt einen Supabase-Fehler weiter, statt die Übersicht zu aktualisieren", async () => {
    updateMock.mockResolvedValue({ error: { message: "db down" } });
    const result = await updateGift("gift-1", undefined, formData(validFields));
    expect(result?.error).toBe("db down");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("lehnt einen falschen Dateityp ab, ohne hochzuladen", async () => {
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(10, "text/plain", "datei.txt")),
    );
    expect(result?.error).toBe(
      "Bitte lade ein Bild im Format JPEG, PNG, WebP oder GIF hoch.",
    );
    expect(uploadStorageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("lehnt ein zu großes Bild ab (> 4 MB), ohne hochzuladen", async () => {
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(4 * 1024 * 1024 + 1)),
    );
    expect(result?.error).toBe("Das Bild darf höchstens 4 MB groß sein.");
    expect(uploadStorageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("laedt ein gültiges Bild hoch und speichert die öffentliche URL", async () => {
    updateMock.mockResolvedValue({ error: null });
    const image = makeImageFile(1024, "image/jpeg");
    const result = await updateGift("gift-1", undefined, formDataWithImage(validFields, image));

    expect(result).toEqual({ success: true });
    expect(uploadStorageMock).toHaveBeenCalledWith(
      "gift-images",
      "user-1/gift-1",
      image,
      { contentType: "image/jpeg", upsert: true },
    );
    expect(updateMock).toHaveBeenCalledWith(
      "gifts",
      expect.objectContaining({
        image_url: "https://example.supabase.co/storage/v1/object/public/gift-images/user-1/gift-1",
      }),
      "id",
      "gift-1",
    );
  });

  it("lässt image_url unverändert, wenn kein neues Bild ausgewählt wurde (leeres File-Input)", async () => {
    updateMock.mockResolvedValue({ error: null });
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(0)),
    );

    expect(result).toEqual({ success: true });
    expect(uploadStorageMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      "gifts",
      { title: "Kräutergarten-Set", link: "https://shop-beispiel.de/kraeutergarten", occasion_id: "occasion-1" },
      "id",
      "gift-1",
    );
  });

  it("gibt einen Fehler zurück, wenn der Upload fehlschlägt", async () => {
    uploadStorageMock.mockResolvedValue({ data: null, error: { message: "upload failed" } });
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(1024, "image/jpeg")),
    );
    expect(result?.error).toBe("upload failed");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("gibt einen Fehler zurück, wenn niemand eingeloggt ist und ein Bild hochgeladen werden soll", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await updateGift(
      "gift-1",
      undefined,
      formDataWithImage(validFields, makeImageFile(1024, "image/jpeg")),
    );
    expect(result?.error).toBe("Bitte melde dich erneut an.");
    expect(uploadStorageMock).not.toHaveBeenCalled();
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
      // @ts-expect-error -- bewusst ungültiger Wert für den Test. "given"
      // zaehlt seit #21/#26 als gueltiger Status (Fruehere Geschenke),
      // deshalb hier ein Wert, der nie gueltig ist.
      setGiftStatus("gift-1", "unbekannt"),
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

describe("addPastGift", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    insertMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  const validPastGiftFields = {
    title: "Kräutergarten-Set",
    occasionId: "occasion-1",
    giftDate: "2025-12-24",
    description: "Hat sich sehr gefreut.",
  };

  it("lehnt einen fehlenden Titel ab", async () => {
    const result = await addPastGift(
      "person-1",
      undefined,
      formData({ ...validPastGiftFields, title: "" }),
    );
    expect(result?.error).toBe("Bitte gib einen Titel für das Geschenk ein.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("lehnt ein fehlendes Datum ab", async () => {
    const result = await addPastGift(
      "person-1",
      undefined,
      formData({ ...validPastGiftFields, giftDate: "" }),
    );
    expect(result?.error).toBe("Bitte gib ein Datum an.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("legt das Geschenk direkt mit status 'given' an, für die übergebene Person", async () => {
    insertMock.mockResolvedValue({ error: null });

    const result = await addPastGift(
      "person-1",
      undefined,
      formData(validPastGiftFields),
    );

    expect(result).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith("gifts", {
      user_id: "user-1",
      person_id: "person-1",
      occasion_id: "occasion-1",
      title: "Kräutergarten-Set",
      status: "given",
      gift_date: "2025-12-24",
      description: "Hat sich sehr gefreut.",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("erlaubt ein Geschenk ohne Anlass und ohne Beschreibung", async () => {
    insertMock.mockResolvedValue({ error: null });

    const result = await addPastGift(
      "person-1",
      undefined,
      formData({
        title: "Gutschein",
        occasionId: "",
        giftDate: "2025-12-24",
        description: "",
      }),
    );

    expect(result).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith(
      "gifts",
      expect.objectContaining({ occasion_id: null, description: null }),
    );
  });

  it("gibt einen Fehler zurück, wenn niemand eingeloggt ist", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await addPastGift(
      "person-1",
      undefined,
      formData(validPastGiftFields),
    );

    expect(result?.error).toBe("Bitte melde dich erneut an.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("gibt einen Fehler zurück, wenn das Anlegen fehlschlägt", async () => {
    insertMock.mockResolvedValue({ error: { message: "db down" } });

    const result = await addPastGift(
      "person-1",
      undefined,
      formData(validPastGiftFields),
    );

    expect(result?.error).toBe("db down");
  });
});
