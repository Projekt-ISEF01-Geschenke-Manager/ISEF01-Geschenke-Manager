// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GiftForm } from "./gift-form";

vi.mock("@/app/actions/gifts", () => ({
  createGift: vi.fn(),
}));

afterEach(() => {
  cleanup();
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

      const hiddenInput = document.querySelector(
        'input[name="personId"]',
      ) as HTMLInputElement;
      expect(hiddenInput).not.toBeNull();
      expect(hiddenInput.type).toBe("hidden");
      expect(hiddenInput.value).toBe("person-1");

      const titleInput = screen.getByLabelText(/idee \*/i);
      expect(document.activeElement).toBe(titleInput);
    },
  );
});
