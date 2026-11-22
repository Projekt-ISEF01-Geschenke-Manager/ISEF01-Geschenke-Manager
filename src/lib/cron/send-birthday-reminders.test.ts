import { describe, it, expect, vi, beforeEach } from "vitest";

const listUsersMock = vi.fn();
const updateUserByIdMock = vi.fn();
const sendEmailMock = vi.fn();

type QueryResult = { data: unknown; error: { message: string } | null };

function makeBuilder(result: QueryResult) {
  const builder: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    then: (resolve: (value: QueryResult) => void) => void;
  } = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (resolve) => resolve(result),
  };
  return builder;
}

const peopleQueue: ReturnType<typeof makeBuilder>[] = [];
const giftsQueue: ReturnType<typeof makeBuilder>[] = [];

function queuePeople(data: unknown, error: { message: string } | null = null) {
  const builder = makeBuilder({ data, error });
  peopleQueue.push(builder);
  return builder;
}

function queueGifts(data: unknown, error: { message: string } | null = null) {
  const builder = makeBuilder({ data, error });
  giftsQueue.push(builder);
  return builder;
}

const fromMock = vi.fn((table: string) => {
  if (table === "people") {
    const builder = peopleQueue.shift();
    if (!builder) throw new Error("unerwarteter people-Aufruf ohne Queue-Eintrag");
    return builder;
  }
  if (table === "gifts") {
    const builder = giftsQueue.shift();
    if (!builder) throw new Error("unerwarteter gifts-Aufruf ohne Queue-Eintrag");
    return builder;
  }
  throw new Error(`unerwartete Tabelle: ${table}`);
});

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => listUsersMock(...args),
        updateUserById: (...args: unknown[]) => updateUserByIdMock(...args),
      },
    },
    from: (table: string) => fromMock(table),
  }),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

const { sendBirthdayReminders } = await import("./send-birthday-reminders");

function confirmedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "jemand@example.de",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  };
}

describe("sendBirthdayReminders", () => {
  beforeEach(() => {
    listUsersMock.mockReset();
    updateUserByIdMock.mockReset().mockResolvedValue({ error: null });
    sendEmailMock.mockReset().mockResolvedValue(undefined);
    fromMock.mockClear();
    peopleQueue.length = 0;
    giftsQueue.length = 0;
  });

  it("tut nichts, wenn heute nicht der 1. ist", async () => {
    await sendBirthdayReminders(new Date("2026-12-15"));

    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it("verschickt eine Mail mit Personen, die im naechsten Monat Geburtstag haben (Dezember -> Januar)", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queuePeople([{ id: "p1", name: "Anna", birthday_day: 5 }]);
    queueGifts([]);

    await sendBirthdayReminders(new Date("2026-12-01"));

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Geburtstage im Januar" }),
    );
  });

  it("ueberspringt Personen mit reminders_enabled=false", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    // Die Datenbank filtert reminders_enabled=false bereits im Query heraus
    // (eq("reminders_enabled", true)) - hier wird geprueft, dass die
    // Anwendung genau diesen Filter tatsaechlich mitschickt.
    const peopleBuilder = queuePeople([]);

    await sendBirthdayReminders(new Date("2026-12-01"));

    expect(peopleBuilder.eq).toHaveBeenCalledWith("reminders_enabled", true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("ueberspringt Konten mit remind_birthdays=false", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: { users: [confirmedUser({ user_metadata: { remind_birthdays: false } })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await sendBirthdayReminders(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("ueberspringt Test-Accounts", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: { users: [confirmedUser({ app_metadata: { is_test_account: true } })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await sendBirthdayReminders(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("ueberspringt unbestaetigte Konten", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: { users: [confirmedUser({ email_confirmed_at: null })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await sendBirthdayReminders(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("verschickt keine Mail, wenn niemand naechsten Monat Geburtstag hat", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queuePeople([]);

    await sendBirthdayReminders(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("laesst 'given'-Geschenke aus der Ideenliste der Mail weg", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queuePeople([{ id: "p1", name: "Anna", birthday_day: 5 }]);
    queueGifts([
      { title: "Schon verschenktes Buch", status: "given" },
      { title: "Neue Kopfhoerer", status: "idea" },
    ]);

    await sendBirthdayReminders(new Date("2026-12-01"));

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.html).toContain("Neue Kopfhoerer");
    expect(call.html).not.toContain("Schon verschenktes Buch");
  });

  it("setzt last_birthday_reminder_month und ueberspringt beim zweiten Lauf im selben Monat", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queuePeople([{ id: "p1", name: "Anna", birthday_day: 5 }]);
    queueGifts([]);

    await sendBirthdayReminders(new Date("2026-12-01"));

    expect(updateUserByIdMock).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        user_metadata: expect.objectContaining({ last_birthday_reminder_month: "2026-12" }),
      }),
    );

    sendEmailMock.mockClear();
    listUsersMock
      .mockReset()
      .mockResolvedValueOnce({
        data: {
          users: [
            confirmedUser({
              user_metadata: { last_birthday_reminder_month: "2026-12" },
            }),
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await sendBirthdayReminders(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
