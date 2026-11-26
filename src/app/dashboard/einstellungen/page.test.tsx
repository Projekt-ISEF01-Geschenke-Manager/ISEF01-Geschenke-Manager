// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

let user: { id: string; app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> };

vi.mock("@/lib/supabase/server", () => ({
  requireUser: async () => ({ user }),
}));

const { default: EinstellungenPage } = await import("./page");

afterEach(() => {
  cleanup();
});

describe("EinstellungenPage", () => {
  it("zeigt Admins einen Link zum Admin-Panel", async () => {
    user = { id: "u1", app_metadata: { is_admin: true }, user_metadata: {} };

    const element = await EinstellungenPage();
    render(element);

    const link = screen.getByRole("link", { name: "Admin-Panel öffnen" });
    expect(link.getAttribute("href")).toBe("/admin");
  });

  it("zeigt Nicht-Admins keinen Admin-Link", async () => {
    user = { id: "u1", app_metadata: {}, user_metadata: {} };

    const element = await EinstellungenPage();
    render(element);

    expect(screen.queryByRole("link", { name: "Admin-Panel öffnen" })).toBeNull();
  });

  it("zeigt bei app_metadata.is_admin !== true (z. B. abgelaufener String-Claim) keinen Admin-Link", async () => {
    user = { id: "u1", app_metadata: { is_admin: "true" }, user_metadata: {} };

    const element = await EinstellungenPage();
    render(element);

    expect(screen.queryByRole("link", { name: "Admin-Panel öffnen" })).toBeNull();
  });
});
