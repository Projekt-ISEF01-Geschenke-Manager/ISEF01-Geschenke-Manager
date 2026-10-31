// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { DashboardOverview } from "./dashboard-overview";

// PersonForm/GiftForm haben eigene Tests (person-form.test.tsx,
// gift-form.test.tsx) - hier interessiert nur, ob die Popups durch die
// richtigen Trigger geöffnet werden und ob onSuccess (simuliert über einen
// Platzhalter-Button) das Popup schließt und die Bestätigung zeigt, nicht
// das Formular selbst.
vi.mock("./person-form", () => ({
  PersonForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div>
      PersonForm-Platzhalter
      <button type="button" onClick={onSuccess}>
        Person-Erfolg simulieren
      </button>
    </div>
  ),
}));
vi.mock("./gift-form", () => ({
  GiftForm: ({
    people,
    onSuccess,
  }: {
    people: { id: string; name: string }[];
    onSuccess?: () => void;
  }) => (
    <div>
      GiftForm-Platzhalter für {people.length} Person(en)
      <button type="button" onClick={onSuccess}>
        Idee-Erfolg simulieren
      </button>
    </div>
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
let closeMock: ReturnType<typeof vi.fn<(returnValue?: string) => void>>;

beforeEach(() => {
  showModalMock = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  closeMock = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  HTMLDialogElement.prototype.showModal = showModalMock;
  HTMLDialogElement.prototype.close = closeMock;
});

afterEach(() => {
  cleanup();
  // @ts-expect-error - jsdom kennt showModal()/close() nativ nicht, Stubs entfernen
  delete HTMLDialogElement.prototype.showModal;
  // @ts-expect-error - siehe oben
  delete HTMLDialogElement.prototype.close;
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

  it("schließt das Person-Popup und zeigt eine Bestätigung, sobald die Person gespeichert wurde", () => {
    render(
      <DashboardOverview
        people={people}
        personCards={personCards}
        occasions={[]}
        upcoming={[]}
        weihnachten={null}
      />,
    );

    const [headerButton] = screen.getAllByRole("button", {
      name: "+ Person anlegen",
    });
    fireEvent.click(headerButton);
    fireEvent.click(screen.getByRole("button", { name: "Person-Erfolg simulieren" }));

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Person wurde hinzugefügt")).not.toBeNull();
  });

  it("schließt das Idee-Popup und zeigt eine Bestätigung, sobald die Idee gespeichert wurde", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Idee-Erfolg simulieren" }));

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Idee wurde erfasst")).not.toBeNull();
  });
});
