import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePathMock(path),
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

const { createPerson, updatePerson, deletePerson } = await import("./people");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const validFields = {
  name: "Oma Erna",
  birthdayDay: "14",
  birthdayMonth: "11",
  birthdayYear: "1960",
  interests: "Garten, Kochen",
  notes: "Mag keine Süßigkeiten mehr.",
};

describe("createPerson", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    insertMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("lehnt einen fehlenden Namen ab", async () => {
    const result = await createPerson(undefined, formData({ ...validFields, name: "" }));
    expect(result?.error).toBe("Bitte gib einen Namen ein.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("lehnt Tag ohne Monat ab (und umgekehrt)", async () => {
    const result = await createPerson(
      undefined,
      formData({ ...validFields, birthdayMonth: "" }),
    );
    expect(result?.error).toBe(
      "Bitte Tag und Monat des Geburtstags zusammen angeben.",
    );
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("lehnt einen kalendarisch unmöglichen Tag ab (31. Februar)", async () => {
    const result = await createPerson(
      undefined,
      formData({ ...validFields, birthdayDay: "31", birthdayMonth: "2" }),
    );
    expect(result?.error).toBe("Dieser Tag gibt es in diesem Monat nicht.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("erlaubt den 29. Februar (Jahr optional, kann Schaltjahr sein)", async () => {
    insertMock.mockResolvedValue({ error: null });
    const result = await createPerson(
      undefined,
      formData({
        ...validFields,
        birthdayDay: "29",
        birthdayMonth: "2",
        birthdayYear: "",
      }),
    );
    expect(result).toBeUndefined();
    expect(insertMock).toHaveBeenCalledWith(
      "people",
      expect.objectContaining({ birthday_day: 29, birthday_month: 2, birthday_year: null }),
    );
  });

  it("lehnt ein unplausibles Geburtsjahr ab", async () => {
    const result = await createPerson(
      undefined,
      formData({ ...validFields, birthdayYear: "1800" }),
    );
    expect(result?.error).toBe("Das Geburtsjahr muss zwischen 1900 und 2100 liegen.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("erlaubt einen Namen ganz ohne Geburtstag", async () => {
    insertMock.mockResolvedValue({ error: null });
    const result = await createPerson(
      undefined,
      formData({
        name: "Mama",
        birthdayDay: "",
        birthdayMonth: "",
        birthdayYear: "",
        interests: "",
        notes: "",
      }),
    );
    expect(result).toBeUndefined();
    expect(insertMock).toHaveBeenCalledWith(
      "people",
      expect.objectContaining({
        birthday_day: null,
        birthday_month: null,
        birthday_year: null,
        interests: [],
        notes: null,
      }),
    );
  });

  it("zerlegt Interessen an Kommas und trimmt sie", async () => {
    insertMock.mockResolvedValue({ error: null });
    await createPerson(
      undefined,
      formData({ ...validFields, interests: " Garten ,Kochen,, Lesen " }),
    );
    expect(insertMock).toHaveBeenCalledWith(
      "people",
      expect.objectContaining({ interests: ["Garten", "Kochen", "Lesen"] }),
    );
  });

  it("legt bei gültigen Daten die Person für die eingeloggte Nutzer:in an", async () => {
    insertMock.mockResolvedValue({ error: null });
    const result = await createPerson(undefined, formData(validFields));

    expect(result).toBeUndefined();
    expect(insertMock).toHaveBeenCalledWith("people", {
      user_id: "user-1",
      name: "Oma Erna",
      birthday_day: 14,
      birthday_month: 11,
      birthday_year: 1960,
      interests: ["Garten", "Kochen"],
      notes: "Mag keine Süßigkeiten mehr.",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("gibt einen Fehler zurück, wenn niemand eingeloggt ist", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await createPerson(undefined, formData(validFields));
    expect(result?.error).toBe("Bitte melde dich erneut an.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("gibt einen Supabase-Fehler weiter", async () => {
    insertMock.mockResolvedValue({ error: { message: "db down" } });
    const result = await createPerson(undefined, formData(validFields));
    expect(result?.error).toBe("db down");
  });
});

describe("updatePerson", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    updateMock.mockReset();
  });

  it("aktualisiert die richtige Person per id", async () => {
    updateMock.mockResolvedValue({ error: null });
    const result = await updatePerson("person-42", undefined, formData(validFields));

    expect(result).toBeUndefined();
    expect(updateMock).toHaveBeenCalledWith(
      "people",
      expect.objectContaining({ name: "Oma Erna" }),
      "id",
      "person-42",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("validiert genauso wie beim Anlegen", async () => {
    const result = await updatePerson(
      "person-42",
      undefined,
      formData({ ...validFields, name: "" }),
    );
    expect(result?.error).toBe("Bitte gib einen Namen ein.");
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("deletePerson", () => {
  it("löscht über die id und aktualisiert die Übersicht", async () => {
    revalidatePathMock.mockClear();
    deleteMock.mockReset().mockResolvedValue({ error: null });

    await deletePerson("person-42");

    expect(deleteMock).toHaveBeenCalledWith("people", "id", "person-42");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });
});
