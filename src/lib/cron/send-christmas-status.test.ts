import { describe, it, expect, vi, beforeEach } from "vitest";

const listUsersMock = vi.fn();
const updateUserByIdMock = vi.fn();
const sendEmailMock = vi.fn();

type QueryResult = { data: unknown; error: { message: string } | null };

// Fuer "gifts" (und jede andere rein thenable-basierte Query ohne
// .maybeSingle()) - gleiches Muster wie send-birthday-reminders.test.ts.
function makeThenableBuilder(result: QueryResult) {
  const builder: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    then: (resolve: (value: QueryResult) => void) => void;
  } = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    then: (resolve) => resolve(result),
  };
  return builder;
}

// Fuer "occasions" - endet auf .maybeSingle() statt direktem await auf dem
// Builder selbst.
function makeMaybeSingleBuilder(result: QueryResult) {
  const builder: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return builder;
}

const occasionsQueue: ReturnType<typeof makeMaybeSingleBuilder>[] = [];
const giftsQueue: ReturnType<typeof makeThenableBuilder>[] = [];

function queueOccasion(data: unknown, error: { message: string } | null = null) {
  const builder = makeMaybeSingleBuilder({ data, error });
  occasionsQueue.push(builder);
  return builder;
}

function queueGifts(data: unknown, error: { message: string } | null = null) {
  const builder = makeThenableBuilder({ data, error });
  giftsQueue.push(builder);
  return builder;
}

const fromMock = vi.fn((table: string) => {
  if (table === "occasions") {
    const builder = occasionsQueue.shift();
    if (!builder) throw new Error("unerwarteter occasions-Aufruf ohne Queue-Eintrag");
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

const { sendChristmasStatusOverview } = await import("./send-christmas-status");

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

// Ein Geschenk mit purchased-Status fuer eine Person - Standardfall fuer
// Tests, die nur pruefen wollen, dass die Mail ueberhaupt verschickt wird.
function onePurchasedGift() {
  return [{ person_id: "p1", status: "purchased", people: { id: "p1", name: "Anna", reminders_enabled: true } }];
}

describe("sendChristmasStatusOverview", () => {
  beforeEach(() => {
    listUsersMock.mockReset();
    updateUserByIdMock.mockReset().mockResolvedValue({ error: null });
    sendEmailMock.mockReset().mockResolvedValue(undefined);
    fromMock.mockClear();
    occasionsQueue.length = 0;
    giftsQueue.length = 0;
  });

  it("tut nichts, wenn heute keiner der drei Zieltage ist", async () => {
    await sendChristmasStatusOverview(new Date("2026-11-02"));

    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it.each([["2026-11-01"], ["2026-12-01"], ["2026-12-15"]])(
    "laeuft am Zieltag %s",
    async (dateStr) => {
      listUsersMock
        .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
        .mockResolvedValueOnce({ data: { users: [] }, error: null });
      queueOccasion({ id: "occ-1" });
      queueGifts(onePurchasedGift());

      await sendChristmasStatusOverview(new Date(dateStr));

      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expect.stringContaining("Weihnachts-Statusübersicht") }),
      );
    },
  );

  it("ueberspringt Personen mit reminders_enabled=false", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queueOccasion({ id: "occ-1" });
    // Die Datenbank filtert reminders_enabled=false bereits im Query heraus
    // (eq("people.reminders_enabled", true)) - die einzige Person dieses
    // Kontos hat Erinnerungen deaktiviert, die Query liefert also leer.
    const giftsBuilder = queueGifts([]);

    await sendChristmasStatusOverview(new Date("2026-12-01"));

    expect(giftsBuilder.eq).toHaveBeenCalledWith("people.reminders_enabled", true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("ueberspringt Konten mit remind_christmas=false", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: { users: [confirmedUser({ user_metadata: { remind_christmas: false } })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await sendChristmasStatusOverview(new Date("2026-12-01"));

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

    await sendChristmasStatusOverview(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("ueberspringt unbestaetigte Konten", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: { users: [confirmedUser({ email_confirmed_at: null })] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await sendChristmasStatusOverview(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("verschickt keine Mail, wenn kein Weihnachten-Anlass existiert (umbenannt/geloescht)", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queueOccasion(null);

    await sendChristmasStatusOverview(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
    // Dedup-Marker wird trotzdem gesetzt (siehe processAccount-Kommentar) -
    // ein Konto ohne Weihnachten-Anlass soll bei einem erneuten Trigger am
    // selben Zieltag nicht nochmal erfolglos geprueft werden.
    expect(updateUserByIdMock).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        user_metadata: expect.objectContaining({ last_christmas_status_date: "2026-12-01" }),
      }),
    );
  });

  it("verschickt keine Mail, wenn niemand ein Weihnachten-Geschenk hat", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queueOccasion({ id: "occ-1" });
    queueGifts([]);

    await sendChristmasStatusOverview(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("zeigt 'besorgt' nur bei mindestens einem purchased-Geschenk, 'given' zaehlt nicht mit", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queueOccasion({ id: "occ-1" });
    queueGifts([
      { person_id: "pA", status: "purchased", people: { id: "pA", name: "Anna", reminders_enabled: true } },
      { person_id: "pB", status: "given", people: { id: "pB", name: "Bert", reminders_enabled: true } },
    ]);

    await sendChristmasStatusOverview(new Date("2026-12-01"));

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const html = sendEmailMock.mock.calls[0][0].html as string;

    const annaIndex = html.indexOf("Anna");
    const bertIndex = html.indexOf("Bert");
    expect(annaIndex).toBeGreaterThanOrEqual(0);
    expect(bertIndex).toBeGreaterThanOrEqual(0);
    expect(html.slice(annaIndex, annaIndex + 300)).toContain(">Geschenk besorgt<");
    expect(html.slice(bertIndex, bertIndex + 300)).toContain(">noch kein Geschenk<");
    expect(html.slice(bertIndex, bertIndex + 300)).not.toContain(">Geschenk besorgt<");
  });

  it("setzt last_christmas_status_date und ueberspringt beim zweiten Lauf am selben Tag", async () => {
    listUsersMock
      .mockResolvedValueOnce({ data: { users: [confirmedUser()] }, error: null })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queueOccasion({ id: "occ-1" });
    queueGifts(onePurchasedGift());

    await sendChristmasStatusOverview(new Date("2026-12-01"));

    expect(updateUserByIdMock).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        user_metadata: expect.objectContaining({ last_christmas_status_date: "2026-12-01" }),
      }),
    );

    sendEmailMock.mockClear();
    listUsersMock
      .mockReset()
      .mockResolvedValueOnce({
        data: {
          users: [confirmedUser({ user_metadata: { last_christmas_status_date: "2026-12-01" } })],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });

    await sendChristmasStatusOverview(new Date("2026-12-01"));

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("ueberspringt den Dedup-Marker eines ANDEREN Zieltags (z. B. 1.12. blockiert den 15.12.-Lauf nicht)", async () => {
    listUsersMock
      .mockResolvedValueOnce({
        data: {
          users: [confirmedUser({ user_metadata: { last_christmas_status_date: "2026-12-01" } })],
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { users: [] }, error: null });
    queueOccasion({ id: "occ-1" });
    queueGifts(onePurchasedGift());

    await sendChristmasStatusOverview(new Date("2026-12-15"));

    expect(sendEmailMock).toHaveBeenCalled();
  });
});
