// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProblemPrismAuth } from "./auth-types";
import { AuthGate } from "./AuthGate";

let unmount: (() => void) | undefined;
const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function createAuth(overrides: Partial<ProblemPrismAuth> = {}) {
  return {
    status: "unauthenticated" as const,
    copyCode: vi.fn(async () => undefined),
    error: undefined,
    isAuthenticated: false,
    isConnecting: false,
    isPending: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    reopen: vi.fn(),
    ...overrides,
  } as unknown as ProblemPrismAuth;
}

function mount(auth: ProblemPrismAuth) {
  const container = document.createElement("div");
  const root = createRoot(container);
  document.body.appendChild(container);
  unmount = () => {
    act(() => root.unmount());
    container.remove();
  };
  act(() => {
    root.render(
      <AuthGate
        auth={auth}
        onCancelConsent={vi.fn()}
        onShowConsent={vi.fn()}
        showConsent={false}
      />,
    );
  });
  return container;
}

afterEach(() => {
  unmount?.();
  unmount = undefined;
});

beforeEach(() => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("AuthGate", () => {
  it("labels the device-code button and announces a successful copy", async () => {
    const auth = createAuth({
      status: "pending",
      pending: {
        expiresAt: Date.now() + 60_000,
        interval: 3,
        userCode: "ABCD-EFGH",
        verificationUrl: "https://openai.com/auth",
      },
    });
    const container = mount(auth);
    const codeButton = container.querySelector<HTMLButtonElement>(".device-code");

    expect(codeButton?.getAttribute("aria-label")).toBe("Copy device code");
    expect(container.querySelector('[role="status"]')?.textContent).toBe("");

    await act(async () => {
      codeButton?.click();
    });

    expect(auth.copyCode).toHaveBeenCalledTimes(1);
    const status = container.querySelector('[role="status"]');
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.textContent).toBe("Copied to clipboard.");
  });

  it("announces when the device code cannot be copied", async () => {
    const auth = createAuth({
      copyCode: vi.fn(async () => {
        throw new Error("Clipboard unavailable");
      }),
      status: "pending",
      pending: {
        expiresAt: Date.now() + 60_000,
        interval: 3,
        userCode: "ABCD-EFGH",
        verificationUrl: "https://openai.com/auth",
      },
    });
    const container = mount(auth);

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".device-code")?.click();
    });

    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Copy unavailable. Select and copy the code instead.",
    );
  });

  it("exposes authentication failures as alerts", () => {
    const container = mount(
      createAuth({
        error: "ChatGPT could not be connected.",
      }),
    );

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "ChatGPT could not be connected.",
    );
  });
});
