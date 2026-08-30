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

const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let App: ComponentType;
let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeAll(async () => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
  window.history.replaceState(null, "", "/sidepanel.html?demo=1&setup=1");
  App = (await import("./App")).default;
}, 30_000);

afterAll(() => {
  act(() => root?.unmount());
  container?.remove();
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("App coaching setup", () => {
  it("exposes the interview path as a compact disclosure", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root?.render(<App />));

    const toggle = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent?.trim() === "Your interview path");
    const path = container.querySelector<HTMLOListElement>(
      "#setup-interview-path",
    );

    expect(toggle).toBeDefined();
    expect(toggle?.getAttribute("aria-controls")).toBe("setup-interview-path");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(path?.hidden).toBe(true);

    act(() => toggle?.click());

    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(path?.hidden).toBe(false);
    expect(path?.querySelectorAll("li")).toHaveLength(5);
  });
});
