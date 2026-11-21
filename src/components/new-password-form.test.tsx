// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NewPasswordForm } from "./new-password-form";

const setNewPasswordMock = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  setNewPassword: (...args: unknown[]) => setNewPasswordMock(...args),
}));

afterEach(() => {
  cleanup();
  setNewPasswordMock.mockReset();
});

describe("NewPasswordForm", () => {
  it("zeigt beide Passwortfelder an", () => {
    render(<NewPasswordForm />);

    expect(document.querySelector('input[name="password"]')).not.toBeNull();
    expect(
      document.querySelector('input[name="passwordRepeat"]'),
    ).not.toBeNull();
  });

  it("zeigt eine Fehlermeldung an, wenn die Action einen Fehler zurückgibt", async () => {
    setNewPasswordMock.mockResolvedValue({
      error: "Die Passwörter stimmen nicht überein.",
    });

    render(<NewPasswordForm />);

    // Die Hilfetext-Span steht im selben <label> wie das Eingabefeld, direkt
    // nach dem Input ohne Leerzeichen dazwischen - der berechnete
    // Accessible Name haengt daher beide Textknoten ohne Trennzeichen
    // aneinander ("Neues PasswortMindestens 8 Zeichen").
    fireEvent.change(screen.getByLabelText("Neues PasswortMindestens 8 Zeichen"), {
      target: { value: "geheim123" },
    });
    fireEvent.change(screen.getByLabelText("Neues Passwort wiederholen"), {
      target: { value: "anders1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /passwort speichern/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Die Passwörter stimmen nicht überein."),
      ).not.toBeNull();
    });
  });

  it(
    "zeigt nach Erfolg eine Bestätigung mit Link zum Dashboard, statt " +
      "kommentarlos dorthin weiterzuleiten",
    async () => {
      setNewPasswordMock.mockResolvedValue({ success: true });

      render(<NewPasswordForm />);

      fireEvent.change(
        screen.getByLabelText("Neues PasswortMindestens 8 Zeichen"),
        { target: { value: "neuesPasswort!1" } },
      );
      fireEvent.change(screen.getByLabelText("Neues Passwort wiederholen"), {
        target: { value: "neuesPasswort!1" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /passwort speichern/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/passwort wurde erfolgreich geändert/i),
        ).not.toBeNull();
      });
      expect(
        screen.getByRole("link", { name: /weiter zur übersicht/i }),
      ).toHaveProperty("href", "http://localhost:3000/dashboard");
      expect(document.querySelector('input[name="password"]')).toBeNull();
    },
  );
});
