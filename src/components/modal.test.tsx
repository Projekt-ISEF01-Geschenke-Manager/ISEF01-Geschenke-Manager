// @vitest-environment jsdom
import { createRef } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import { Modal } from "./modal";

afterEach(() => {
  cleanup();
});

describe("Modal", () => {
  it("schließt beim Klick auf den Schließen-Button", () => {
    const dialogRef = createRef<HTMLDialogElement>();
    const { getByLabelText } = render(
      <Modal dialogRef={dialogRef} title="Test-Popup">
        <p>Inhalt</p>
      </Modal>,
    );
    const closeSpy = vi
      .spyOn(HTMLDialogElement.prototype, "close")
      .mockImplementation(() => {});

    fireEvent.click(getByLabelText("Schließen"));

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("schließt beim Klick auf den Hintergrund (dialog-Element selbst als Ziel)", () => {
    const dialogRef = createRef<HTMLDialogElement>();
    render(
      <Modal dialogRef={dialogRef} title="Test-Popup">
        <p>Inhalt</p>
      </Modal>,
    );
    const closeSpy = vi
      .spyOn(HTMLDialogElement.prototype, "close")
      .mockImplementation(() => {});

    // Klick direkt auf das <dialog> (entspricht dem Klick auf ::backdrop,
    // siehe Kommentar in modal.tsx).
    fireEvent.click(dialogRef.current!);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("schließt NICHT beim Klick auf den Inhalt", () => {
    const dialogRef = createRef<HTMLDialogElement>();
    const { getByText } = render(
      <Modal dialogRef={dialogRef} title="Test-Popup">
        <p>Inhalt</p>
      </Modal>,
    );
    const closeSpy = vi
      .spyOn(HTMLDialogElement.prototype, "close")
      .mockImplementation(() => {});

    fireEvent.click(getByText("Inhalt"));

    expect(closeSpy).not.toHaveBeenCalled();
  });
});
