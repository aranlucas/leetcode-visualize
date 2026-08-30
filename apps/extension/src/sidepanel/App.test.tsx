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
  window.history.replaceState(null, "", "/sidepanel.html?demo=1");
  App = (await import("./App")).default;
}, 30_000);

afterAll(() => {
  unmount();
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("App learning modes", () => {
  it("keeps visited panel state mounted while switching modes", () => {
    mount();
    const answer = container?.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Your interview answer"]',
    );
    expect(answer).toBeDefined();

    act(() => {
      if (!answer) return;
      const setTextareaValue = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setTextareaValue?.call(
        answer,
        "I would track each earlier value in a map.",
      );
      answer.dispatchEvent(new Event("input", { bubbles: true }));
    });

    clickButton("Hints");
    clickButton("Show me a hint");
    expect(container?.querySelector("#tabpanel-approach")?.hasAttribute("hidden")).toBe(
      true,
    );

    clickButton("Approach");
    expect(container?.querySelector("#tabpanel-approach")?.hasAttribute("hidden")).toBe(
      false,
    );
    expect(
      container?.querySelector<HTMLTextAreaElement>(
        'textarea[aria-label="Your interview answer"]',
      )?.value,
    ).toBe("I would track each earlier value in a map.");

    clickButton("Hints");
    expect(container?.textContent).toContain("Hint 1");
    unmount();
  });

  it("supports roving keyboard navigation across the tablist", () => {
    mount();
    for (const tabButton of container?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    ) ?? []) {
      const panelId = tabButton.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      expect(container?.querySelector(`#${panelId}`)).not.toBeNull();
    }

    const approach = container?.querySelector<HTMLButtonElement>("#tab-approach");
    expect(approach?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      approach?.focus();
      approach?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "End" }),
      );
    });

    const code = container?.querySelector<HTMLButtonElement>("#tab-code");
    expect(code?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(code);
    expect(container?.querySelector("#tabpanel-code")?.hasAttribute("hidden")).toBe(
      false,
    );
    unmount();
  });
});
