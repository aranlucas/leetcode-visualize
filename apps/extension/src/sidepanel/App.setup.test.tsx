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

describe("App first visit", () => {
  it("prepares context automatically and leaves chat available", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root?.render(<App />));
    expect(container.querySelector("#problem-chat-input")).not.toBeNull();
    expect(container.textContent).toContain("Find two different positions");
    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.textContent).not.toContain("Start coaching");
  });
});
