// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DeletePersonButton } from "./delete-person-button";
import { deletePerson } from "@/app/actions/people";

vi.mock("@/app/actions/people", () => ({
  deletePerson: vi.fn(),
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const deletePersonMock = vi.mocked(deletePerson);

beforeEach(() => {
  pushMock.mockClear();
  deletePersonMock.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DeletePersonButton", () => {
  it(
    "leitet nach erfolgreichem Löschen zu redirectTo weiter, wenn gesetzt " +
      "(z. B. von der Personenseite zurück zur Übersicht)",
    async () => {
      deletePersonMock.mockResolvedValue({ success: true });
      render(
        <DeletePersonButton
          personId="person-1"
          personName="Oma Erna"
          redirectTo="/dashboard"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    },
  );

  it("leitet NICHT weiter, wenn kein redirectTo übergeben wurde", async () => {
    deletePersonMock.mockResolvedValue({ success: true });
    render(<DeletePersonButton personId="person-1" personName="Oma Erna" />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    await waitFor(() => expect(deletePersonMock).toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("bricht ab, wenn die Sicherheitsabfrage abgelehnt wird", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <DeletePersonButton
        personId="person-1"
        personName="Oma Erna"
        redirectTo="/dashboard"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    expect(deletePersonMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
