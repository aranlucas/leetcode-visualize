// @vitest-environment jsdom

import { act, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./useProblemPrismAuth", () => ({
  useProblemPrismAuth: () => ({
    copyCode: vi.fn(async () => undefined),
    isAuthenticated: true,
    isConnecting: false,
    isPending: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    reopen: vi.fn(),
    status: "authenticated",
  }),
}));

let App: ComponentType;
let root: Root | undefined;
let container: HTMLDivElement | undefined;

const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function clickButton(name: string) {
  const button = Array.from(
    container?.querySelectorAll<HTMLButtonElement>("button") ?? [],
  ).find((candidate) => candidate.textContent?.trim() === name);
  expect(button, `Expected a button named ${name}`).toBeDefined();
  act(() => button?.click());
  return button;
}

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<App />));
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
}

beforeAll(async () => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
  HTMLElement.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/sidepanel.html?demo=1");
  App = (await import("./App")).default;
}, 30_000);

afterAll(() => {
  unmount();
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("App problem conversation", () => {
  it("opens with problem context and chat without setup or tabs", () => {
    mount();
    expect(container?.querySelector('[role="tablist"]')).toBeNull();
    expect(container?.querySelector("select")).toBeNull();
    expect(container?.querySelector("#problem-chat-input")).not.toBeNull();
    expect(container?.textContent).toContain("Find two different positions");
    const practice = Array.from(container?.querySelectorAll("details") ?? [])
      .find((detail) => detail.querySelector("summary")?.textContent === "Practice for an interview");
    expect(practice).toBeDefined();
    expect(practice?.open).toBe(false);
    unmount();
  });

  it("preserves interview work when optional practice is closed", () => {
    mount();
    const practice = Array.from(container?.querySelectorAll("details") ?? [])
      .find((detail) => detail.querySelector("summary")?.textContent === "Practice for an interview");
    act(() => { practice?.querySelector("summary")?.click(); });
    clickButton("Next: Notice");
    act(() => { practice?.querySelector("summary")?.click(); });
    expect(practice?.open).toBe(false);
    act(() => { practice?.querySelector("summary")?.click(); });
    expect(practice?.textContent).toContain("Notice the relationship");
    expect(practice?.querySelector(".stage-progress summary")?.textContent).toContain("Step 2 of 5");
    unmount();
  });
});
