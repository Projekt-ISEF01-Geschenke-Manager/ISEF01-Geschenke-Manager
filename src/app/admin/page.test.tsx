// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AdminAccountRow } from "@/app/actions/admin";

let accounts: AdminAccountRow[] = [];

vi.mock("@/lib/supabase/server", () => ({
  requireAdmin: async () => ({
    user: { id: "admin-1", app_metadata: { is_admin: true } },
  }),
}));

vi.mock("@/app/actions/admin", () => ({
  listAllAccounts: async () => accounts,
  deleteAccount: vi.fn(),
}));

const { default: AdminPage } = await import("./page");

afterEach(() => {
  cleanup();
});

describe("AdminPage", () => {
  it("zeigt E-Mail, Registrierungsdatum und Bestaetigt-Status jedes Kontos", async () => {
    accounts = [
      { id: "u1", email: "a@b.de", createdAt: "2026-01-15T10:00:00Z", confirmed: true },
    ];

    const element = await AdminPage();
    render(element);

    expect(screen.getByText("a@b.de")).not.toBeNull();
    expect(screen.getByText(new Date("2026-01-15T10:00:00Z").toLocaleDateString("de-DE"))).not.toBeNull();
    expect(screen.getByText("Bestätigt")).not.toBeNull();
  });

  it("zeigt einen eindeutigen Hinweistext bei unbestaetigtem Konto (nicht nur Farbe)", async () => {
    accounts = [
      { id: "u1", email: "a@b.de", createdAt: "2026-01-15T10:00:00Z", confirmed: false },
    ];

    const element = await AdminPage();
    render(element);

    expect(screen.getByText("Nicht bestätigt")).not.toBeNull();
  });

  it("rendert fuer jedes Konto einen Loeschen-Button", async () => {
    accounts = [
      { id: "u1", email: "a@b.de", createdAt: "2026-01-15T10:00:00Z", confirmed: true },
      { id: "u2", email: "c@d.de", createdAt: "2026-02-01T10:00:00Z", confirmed: false },
    ];

    const element = await AdminPage();
    render(element);

    expect(screen.getAllByText("Löschen")).toHaveLength(2);
  });

  it("zeigt eine Meldung, wenn kein Konto in der Liste ist", async () => {
    accounts = [];

    const element = await AdminPage();
    render(element);

    expect(screen.getByText(/[Kk]ein(e)? Konto/)).not.toBeNull();
  });
});
