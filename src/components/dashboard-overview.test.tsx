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

// jsdom implementiert <dialog> nur als normales Element, showModal()
// existiert dort nicht einmal als No-op-Stub (vi.spyOn bräuchte eine
// bestehende Methode zum Umhüllen) - deshalb selbst auf dem Prototyp
// definieren statt zu spyOn.
let showModalMock: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  showModalMock = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.showModal = showModalMock;
});

afterEach(() => {
  cleanup();
  // @ts-expect-error - jsdom kennt showModal() nativ nicht, Stub entfernen
  delete HTMLDialogElement.prototype.showModal;
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

    // "+ Person anlegen" gibt es zweimal (Header-Button + Kachel unten in
    // der Liste, siehe nächster Test) - hier gezielt der erste Treffer.
    const [headerButton] = screen.getAllByRole("button", {
      name: "+ Person anlegen",
    });
    fireEvent.click(headerButton);

    expect(showModalMock).toHaveBeenCalledTimes(1);
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

    expect(showModalMock).toHaveBeenCalledTimes(1);
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

    expect(showModalMock).toHaveBeenCalledTimes(1);
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
