// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { DashboardOverview } from "./dashboard-overview";

// PersonForm/GiftForm haben eigene Tests (person-form.test.tsx fehlt noch,
// gift-form.test.tsx existiert) - hier interessiert nur, ob die Popups
// durch die richtigen Trigger geöffnet werden, nicht das Formular selbst.
vi.mock("./person-form", () => ({
  PersonForm: () => <div>PersonForm-Platzhalter</div>,
}));
vi.mock("./gift-form", () => ({
  GiftForm: ({ people }: { people: { id: string; name: string }[] }) => (
    <div>GiftForm-Platzhalter für {people.length} Person(en)</div>
  ),
}));

const people = [
  { id: "1", name: "Jakob" },
  { id: "2", name: "Richard" },
];
const personCards = people.map((p) => ({
  id: p.id,
  name: p.name,
  birthday: null,
  interests: [],
  ideaCount: 0,
  purchasedCount: 0,
}));

let showModalSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  showModalSpy = vi
    .spyOn(HTMLDialogElement.prototype, "showModal")
    .mockImplementation(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DashboardOverview", () => {
  it('öffnet das Person-Popup über den "+ Person anlegen"-Button oben', () => {
    render(
      <DashboardOverview
        people={people}
        personCards={personCards}
        occasions={[]}
        upcoming={[]}
        weihnachten={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Person anlegen" }));

    expect(showModalSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("PersonForm-Platzhalter")).not.toBeNull();
  });

  it('öffnet dasselbe Person-Popup über die Kachel in der Personenliste', () => {
    render(
      <DashboardOverview
        people={people}
        personCards={personCards}
        occasions={[]}
        upcoming={[]}
        weihnachten={null}
      />,
    );

    // Zweiter Weg (Wireframe-Annotation 8) - nicht der erste Treffer
    // (Header-Button), sondern die gestrichelte Kachel in der Liste.
    const addButtons = screen.getAllByText("+ Person anlegen");
    fireEvent.click(addButtons[addButtons.length - 1]);

    expect(showModalSpy).toHaveBeenCalledTimes(1);
  });

  it('öffnet das Idee-Popup über "+ Idee erfassen" und reicht people/occasions durch', () => {
    render(
      <DashboardOverview
        people={people}
        personCards={personCards}
        occasions={[]}
        upcoming={[]}
        weihnachten={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Idee erfassen" }));

    expect(showModalSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("GiftForm-Platzhalter für 2 Person(en)"),
    ).not.toBeNull();
  });

  it('zeigt "+ Idee erfassen" gar nicht, solange es keine Personen gibt', () => {
    render(
      <DashboardOverview
        people={[]}
        personCards={[]}
        occasions={[]}
        upcoming={[]}
        weihnachten={null}
      />,
    );

    expect(screen.queryByRole("button", { name: "+ Idee erfassen" })).toBeNull();
  });
});
