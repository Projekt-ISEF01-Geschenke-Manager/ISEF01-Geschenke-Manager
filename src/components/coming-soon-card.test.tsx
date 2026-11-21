// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ComingSoonCard } from "./coming-soon-card";

afterEach(cleanup);

describe("ComingSoonCard", () => {
  it("zeigt Titel und Beschreibung an", () => {
    render(
      <ComingSoonCard title="Frühere Geschenke" description="Folgt später." />,
    );

    expect(
      screen.getByRole("heading", { name: "Frühere Geschenke" }),
    ).not.toBeNull();
    expect(screen.getByText("Folgt später.")).not.toBeNull();
  });
});
