// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GiftForm } from "./gift-form";

const createGiftMock = vi.fn();
vi.mock("@/app/actions/gifts", () => ({
  createGift: (...args: unknown[]) => createGiftMock(...args),
}));

afterEach(() => {
  cleanup();
  createGiftMock.mockReset();
});

const occasions = [{ id: "occasion-1", name: "Weihnachten" }];
const people = [{ id: "person-1", name: "Oma Erna" }];

describe("GiftForm", () => {
  it("zeigt ohne lockedPersonName das Personen-Dropdown und keinen Hidden-Input", () => {
    render(<GiftForm people={people} occasions={occasions} />);

    expect(
      screen.getByRole("combobox", { name: /für wen/i }),
    ).not.toBeNull();
    expect(document.querySelector('input[name="personId"]')).toBeNull();
  });

  it(
    "verwendet mit lockedPersonName einen Hidden-Input statt Dropdown " +
      "und fokussiert den Titel (A8: Person steht schon fest)",
    () => {
      render(
        <GiftForm
          occasions={occasions}
          defaultPersonId="person-1"
          lockedPersonName="Oma Erna"
        />,
      );

      expect(
        screen.queryByRole("combobox", { name: /für wen/i }),
      ).toBeNull();

      const personIdField = document.querySelector('input[name="personId"]');
      expect(personIdField).not.toBeNull();
      expect(personIdField?.getAttribute("type")).toBe("hidden");
      expect(personIdField?.getAttribute("value")).toBe("person-1");

      const titleInput = screen.getByLabelText(/idee \*/i);
      expect(document.activeElement).toBe(titleInput);
    },
  );

  it("ruft onSuccess auf, sobald das Speichern erfolgreich war (Popup auf der Übersicht soll dann schließen)", async () => {
    createGiftMock.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    render(
      <GiftForm
        people={people}
        occasions={occasions}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /für wen/i }), {
      target: { value: "person-1" },
    });
    fireEvent.change(screen.getByLabelText(/idee \*/i), {
      target: { value: "Kräutergarten-Set" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Idee speichern" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it("ruft onSuccess NICHT auf, wenn das Speichern fehlschlägt", async () => {
    createGiftMock.mockResolvedValue({ error: "db down" });
    const onSuccess = vi.fn();
    render(
      <GiftForm
        people={people}
        occasions={occasions}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /für wen/i }), {
      target: { value: "person-1" },
    });
    fireEvent.change(screen.getByLabelText(/idee \*/i), {
      target: { value: "Kräutergarten-Set" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Idee speichern" }));

    await waitFor(() => expect(screen.getByText("db down")).not.toBeNull());
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
