import { describe, it, expect, vi, beforeEach } from "vitest";

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const signInWithPasswordMock = vi.fn();
const signUpMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
      signOut: signOutMock,
    },
  }),
}));

const checkAndRecordAttemptMock = vi.fn();
const releaseAttemptMock = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  checkAndRecordAttempt: (...args: unknown[]) =>
    checkAndRecordAttemptMock(...args),
  releaseAttempt: (...args: unknown[]) => releaseAttemptMock(...args),
  RATE_LIMIT_MESSAGE: "Zu viele Versuche. Bitte warte 15 Minuten und versuche es erneut.",
}));

const { login, signup, signout } = await import("./auth");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("login", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    signInWithPasswordMock.mockReset();
    checkAndRecordAttemptMock
      .mockReset()
      .mockResolvedValue({ limited: false, attemptId: "attempt-1" });
    releaseAttemptMock.mockReset();
  });

  it("leitet bei erfolgreichem Login auf /dashboard weiter und gibt die Reservierung wieder frei", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });

    const result = await login(
      undefined,
      formData({ email: "jakob@example.de", password: "geheim123" }),
    );

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "jakob@example.de",
      password: "geheim123",
    });
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    expect(result).toBeUndefined();
    // Erfolgreicher Login soll nie selbst dazu beitragen, ausgesperrt zu
    // werden - die Reservierung wird wieder freigegeben.
    expect(releaseAttemptMock).toHaveBeenCalledWith("attempt-1");
  });

  it("gibt bei falschen Zugangsdaten eine neutrale Fehlermeldung zurück (verrät nicht, ob der Account existiert) und lässt die Reservierung stehen", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    const result = await login(
      undefined,
      formData({ email: "jakob@example.de", password: "falsch" }),
    );

    expect(result).toEqual({
      error: "E-Mail oder Passwort ist falsch.",
      email: "jakob@example.de",
    });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(checkAndRecordAttemptMock).toHaveBeenCalledWith(
      "login",
      "jakob@example.de",
    );
    // Fehlgeschlagener Versuch zaehlt gegen das Limit - keine Freigabe.
    expect(releaseAttemptMock).not.toHaveBeenCalled();
  });

  it("blockiert bei zu vielen Versuchen (QA5), ohne Supabase überhaupt aufzurufen", async () => {
    checkAndRecordAttemptMock.mockResolvedValue({
      limited: true,
      attemptId: null,
    });

    const result = await login(
      undefined,
      // Kein echtes Passwort noetig - der Rate-Limit-Check blockiert
      // schon davor, bevor Supabase ueberhaupt gefragt wird.
      formData({
        email: "jakob@example.de",
        password: "wird-durch-rate-limit-blockiert",
      }),
    );

    expect(result).toEqual({
      error: "Zu viele Versuche. Bitte warte 15 Minuten und versuche es erneut.",
      email: "jakob@example.de",
    });
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("signup", () => {
  const validFields = {
    name: "Jakob",
    email: "jakob@example.de",
    password: "geheim123",
    passwordRepeat: "geheim123",
    privacyAccepted: "on",
  };

  beforeEach(() => {
    redirectMock.mockClear();
    signUpMock.mockReset();
    checkAndRecordAttemptMock
      .mockReset()
      .mockResolvedValue({ limited: false, attemptId: "attempt-1" });
    releaseAttemptMock.mockReset();
  });

  it("lehnt einen fehlenden Vornamen ab", async () => {
    const result = await signup(
      undefined,
      formData({ ...validFields, name: "" }),
    );

    expect(result?.error).toBe("Bitte gib deinen Vornamen ein.");
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("lehnt ein zu kurzes Passwort ab (unter 8 Zeichen)", async () => {
    const result = await signup(
      undefined,
      formData({ ...validFields, password: "kurz", passwordRepeat: "kurz" }),
    );

    expect(result?.error).toBe(
      "Das Passwort muss mindestens 8 Zeichen lang sein.",
    );
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("lehnt nicht übereinstimmende Passwörter ab", async () => {
    const result = await signup(
      undefined,
      formData({ ...validFields, passwordRepeat: "andere-eingabe" }),
    );

    expect(result?.error).toBe("Die Passwörter stimmen nicht überein.");
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("lehnt eine fehlende Datenschutz-Zustimmung ab", async () => {
    const fields = { ...validFields } as Record<string, string>;
    delete fields.privacyAccepted;

    const result = await signup(undefined, formData(fields));

    expect(result?.error).toBe(
      "Bitte bestätige, dass du die Datenschutzerklärung gelesen hast.",
    );
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("behält Name/E-Mail bei einem Validierungsfehler, aber nie das Passwort", async () => {
    const result = await signup(
      undefined,
      formData({ ...validFields, passwordRepeat: "andere-eingabe" }),
    );

    expect(result?.values).toEqual({
      name: "Jakob",
      email: "jakob@example.de",
    });
    expect(result?.values).not.toHaveProperty("password");
  });

  it("registriert bei gültigen Daten und leitet auf /register/check-email weiter", async () => {
    signUpMock.mockResolvedValue({ error: null });

    const result = await signup(undefined, formData(validFields));

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "jakob@example.de",
        password: "geheim123",
        options: expect.objectContaining({
          data: { full_name: "Jakob" },
        }),
      }),
    );
    expect(redirectMock).toHaveBeenCalledWith("/register/check-email");
    expect(result).toBeUndefined();
    expect(checkAndRecordAttemptMock).toHaveBeenCalledWith(
      "register",
      "jakob@example.de",
    );
    // Anders als beim Login: jeder Registrierungsversuch zaehlt, auch ein
    // erfolgreicher - keine Freigabe.
    expect(releaseAttemptMock).not.toHaveBeenCalled();
  });

  it("blockiert bei zu vielen Registrierungsversuchen für dieselbe E-Mail (QA5)", async () => {
    checkAndRecordAttemptMock.mockResolvedValue({
      limited: true,
      attemptId: null,
    });

    const result = await signup(undefined, formData(validFields));

    expect(result?.error).toBe(
      "Zu viele Versuche. Bitte warte 15 Minuten und versuche es erneut.",
    );
    expect(signUpMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("gibt einen Supabase-Fehler weiter, z. B. bei bereits registrierter E-Mail", async () => {
    signUpMock.mockResolvedValue({
      error: { message: "User already registered" },
    });

    const result = await signup(undefined, formData(validFields));

    expect(result?.error).toBe("User already registered");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("signout", () => {
  it("meldet ab und leitet zur Startseite weiter", async () => {
    redirectMock.mockClear();
    signOutMock.mockClear();

    await signout();

    expect(signOutMock).toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
