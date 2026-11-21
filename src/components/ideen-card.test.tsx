// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { IdeenCard } from "./ideen-card";

vi.mock("@/app/actions/gifts", () => ({
  createGift: vi.fn(),
}));

afterEach(cleanup);

describe("IdeenCard", () => {
  it("zeigt die Ideen-Liste, aber die Schnelleingabe erst nach Klick auf „+ Idee hinzufügen“", () => {
    render(
      <IdeenCard personId="person-1" giftsCount={2} occasions={[]}>
        <p>Liste der Ideen</p>
      </IdeenCard>,
    );

    expect(screen.getByText("Ideen (2)")).not.toBeNull();
    expect(screen.getByText("Liste der Ideen")).not.toBeNull();
    expect(
      screen.queryByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "+ Idee hinzufügen" }),
    );

    expect(
      screen.getByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));

    expect(
      screen.queryByPlaceholderText(/neue idee, z\. b\. gartenschere/i),
    ).toBeNull();
  });
});
