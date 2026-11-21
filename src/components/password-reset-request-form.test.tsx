// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PasswordResetRequestForm } from "./password-reset-request-form";

const requestPasswordResetMock = vi.fn();
vi.mock("@/app/actions/auth", () => ({
  requestPasswordReset: (...args: unknown[]) => requestPasswordResetMock(...args),
}));

afterEach(() => {
  cleanup();
  requestPasswordResetMock.mockReset();
});

describe("PasswordResetRequestForm", () => {
  it("zeigt das Formular mit E-Mail-Feld an", () => {
    render(<PasswordResetRequestForm />);

    expect(screen.getByLabelText(/e-mail/i)).not.toBeNull();
    expect(screen.getByRole("button", { name: /link anfordern/i })).not.toBeNull();
  });

  it("ersetzt das Formular nach dem Absenden durch die neutrale Rückmeldung (ZA6)", async () => {
    requestPasswordResetMock.mockResolvedValue({
      message:
        "Wenn zu dieser E-Mail-Adresse ein bestätigtes Konto existiert, haben wir einen Link zum Zurücksetzen verschickt.",
    });

    render(<PasswordResetRequestForm />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "jakob@example.de" },
    });
    fireEvent.click(screen.getByRole("button", { name: /link anfordern/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/haben wir einen link zum zurücksetzen verschickt/i),
      ).not.toBeNull();
    });
    expect(screen.queryByLabelText(/e-mail/i)).toBeNull();
  });
});
