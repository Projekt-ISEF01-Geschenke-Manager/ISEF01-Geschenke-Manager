// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

let fullName: string | undefined = "Adrian";
let email: string | undefined = "adrian@example.com";

vi.mock("@/lib/supabase/server", () => ({
  requireUser: async () => ({
    user: {
      user_metadata: { full_name: fullName },
      email,
    },
  }),
}));

vi.mock("@/app/actions/auth", () => ({
  signout: async () => {},
}));

// DashboardNav (im nav-Slot von SiteHeader) nutzt usePathname() fuer den
// aktiven Tab - braucht ausserhalb eines echten Next.js-Router-Kontexts
// einen Mock, fuer diese Tests selbst ohne Bedeutung.
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

const { default: DashboardLayout } = await import("./layout");

beforeEach(() => {
  fullName = "Adrian";
  email = "adrian@example.com";
});

afterEach(() => {
  cleanup();
});

describe("DashboardLayout", () => {
  it("zeigt den Vornamen aus den Nutzer:innen-Metadaten", async () => {
    const element = await DashboardLayout({ children: <div />, params: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("Adrian")).not.toBeNull();
  });

  it("zeigt nur den ersten Namen, auch wenn full_name mehrere Wörter enthält", async () => {
    fullName = "Jakob Höynck";

    const element = await DashboardLayout({ children: <div />, params: Promise.resolve({}) });
    render(element);

    expect(screen.getByText("Jakob")).not.toBeNull();
    expect(screen.queryByText("Jakob Höynck")).toBeNull();
  });

  it(
    "nutzt den Teil vor dem @ aus der E-Mail als Fallback, wenn kein " +
      "full_name hinterlegt ist (z. B. ältere Konten ohne diese Metadaten)",
    async () => {
      fullName = undefined;
      email = "mia.schmidt@example.com";

      const element = await DashboardLayout({ children: <div />, params: Promise.resolve({}) });
      render(element);

      expect(screen.getByText("mia.schmidt")).not.toBeNull();
    },
  );

  it(
    "nutzt den E-Mail-Fallback auch, wenn full_name nur aus Leerzeichen " +
      "besteht (nicht nur bei undefined)",
    async () => {
      fullName = "   ";
      email = "lea.vogel@example.com";

      const element = await DashboardLayout({ children: <div />, params: Promise.resolve({}) });
      render(element);

      expect(screen.getByText("lea.vogel")).not.toBeNull();
    },
  );

  it("zeigt die Zeile gar nicht, wenn weder Name noch E-Mail hinterlegt sind", async () => {
    fullName = undefined;
    email = undefined;

    const element = await DashboardLayout({ children: <div />, params: Promise.resolve({}) });
    render(element);

    expect(screen.queryByText(/Angemeldet als/)).toBeNull();
  });

  it("rendert die children innerhalb von Header und Footer", async () => {
    const element = await DashboardLayout({
      children: <div data-testid="dashboard-child">Inhalt</div>,
      params: Promise.resolve({}),
    });
    render(element);

    expect(screen.getByTestId("dashboard-child")).not.toBeNull();
  });
});
