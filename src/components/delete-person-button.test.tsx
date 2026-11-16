// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DeletePersonButton } from "./delete-person-button";
import { deletePerson } from "@/app/actions/people";

vi.mock("@/app/actions/people", () => ({
  deletePerson: vi.fn(),
}));

const deletePersonMock = vi.mocked(deletePerson);

beforeEach(() => {
  deletePersonMock.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DeletePersonButton", () => {
  // Die eigentliche Weiterleitung passiert serverseitig in der
  // deletePerson-Action (redirect()), siehe people.test.ts - hier wird nur
  // geprueft, dass die Komponente redirectTo korrekt mit personId an die
  // Action bindet (Issue #156: vorher per router.push() im Client, was zu
  // einer 404-Seite statt Weiterleitung fuehren konnte).
  it(
    "bindet redirectTo an die deletePerson-Action, wenn gesetzt " +
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

      await waitFor(() =>
        expect(deletePersonMock).toHaveBeenCalledWith(
          "person-1",
          "/dashboard",
          undefined,
          expect.anything(),
        ),
      );
    },
  );

  it("bindet redirectTo als undefined, wenn keines übergeben wurde", async () => {
    deletePersonMock.mockResolvedValue({ success: true });
    render(<DeletePersonButton personId="person-1" personName="Oma Erna" />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    await waitFor(() =>
      expect(deletePersonMock).toHaveBeenCalledWith(
        "person-1",
        undefined,
        undefined,
        expect.anything(),
      ),
    );
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
  });
});
