// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DeleteAccountButton } from "./delete-account-button";
import { deleteAccount } from "@/app/actions/admin";

vi.mock("@/app/actions/admin", () => ({
  deleteAccount: vi.fn(),
}));

const deleteAccountMock = vi.mocked(deleteAccount);

beforeEach(() => {
  deleteAccountMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DeleteAccountButton", () => {
  it("ruft die Action nicht auf, wenn die Sicherheitsabfrage abgebrochen wird", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DeleteAccountButton accountId="u1" email="a@b.de" />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    expect(deleteAccountMock).not.toHaveBeenCalled();
  });

  it("ruft die Action mit der accountId auf, wenn bestaetigt", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteAccountMock.mockResolvedValue(undefined);
    render(<DeleteAccountButton accountId="u1" email="a@b.de" />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    await waitFor(() =>
      expect(deleteAccountMock).toHaveBeenCalledWith("u1", undefined, expect.anything()),
    );
  });

  it("nennt die E-Mail-Adresse in der Sicherheitsabfrage", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DeleteAccountButton accountId="u1" email="a@b.de" />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("a@b.de"));
  });

  it("zeigt eine Fehlermeldung, wenn die Action einen Fehler liefert", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteAccountMock.mockResolvedValue({ error: "Konto konnte nicht gelöscht werden." });
    render(<DeleteAccountButton accountId="u1" email="a@b.de" />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    expect(await screen.findByText("Konto konnte nicht gelöscht werden.")).not.toBeNull();
  });
});
