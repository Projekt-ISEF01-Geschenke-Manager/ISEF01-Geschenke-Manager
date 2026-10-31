// @vitest-environment jsdom
import { createRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import { Modal } from "./modal";

// jsdom implementiert <dialog> nur als normales Element, showModal()/close()
// existieren dort nicht einmal als No-op-Stubs (vi.spyOn bräuchte eine
// bestehende Methode zum Umhüllen) - deshalb selbst auf dem Prototyp
// definieren statt zu spyOn.
let closeMock: ReturnType<typeof vi.fn<(returnValue?: string) => void>>;

beforeEach(() => {
  closeMock = vi.fn();
  HTMLDialogElement.prototype.close = closeMock;
});

afterEach(() => {
  cleanup();
  // @ts-expect-error - jsdom kennt close() nativ nicht, Stub wieder entfernen
  delete HTMLDialogElement.prototype.close;
});

describe("Modal", () => {
  it("schließt beim Klick auf den Schließen-Button", () => {
    const dialogRef = createRef<HTMLDialogElement>();
    const { getByLabelText } = render(
      <Modal dialogRef={dialogRef} title="Test-Popup">
        <p>Inhalt</p>
      </Modal>,
    );

    fireEvent.click(getByLabelText("Schließen"));

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("schließt beim Klick auf den Hintergrund (dialog-Element selbst als Ziel)", () => {
    const dialogRef = createRef<HTMLDialogElement>();
    render(
      <Modal dialogRef={dialogRef} title="Test-Popup">
        <p>Inhalt</p>
      </Modal>,
    );

    // Klick direkt auf das <dialog> (entspricht dem Klick auf ::backdrop,
    // siehe Kommentar in modal.tsx).
    const dialog = dialogRef.current;
    if (!dialog) {
      throw new Error("dialogRef wurde nicht gesetzt");
    }
    fireEvent.click(dialog);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("schließt NICHT beim Klick auf den Inhalt", () => {
    const dialogRef = createRef<HTMLDialogElement>();
    const { getByText } = render(
      <Modal dialogRef={dialogRef} title="Test-Popup">
        <p>Inhalt</p>
      </Modal>,
    );

    fireEvent.click(getByText("Inhalt"));

    expect(closeMock).not.toHaveBeenCalled();
  });
});
