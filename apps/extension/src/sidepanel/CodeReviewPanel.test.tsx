// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CodeReview, CurrentCode, Problem } from "../types";
import { reviewCurrentCode } from "./bridge";
import { CodeReviewPanel } from "./CodeReviewPanel";

vi.mock("./bridge", () => ({
  reviewCurrentCode: vi.fn(),
}));

const mockedReviewCurrentCode = vi.mocked(reviewCurrentCode);
const problem: Problem = {
  description: "Return two indices whose values add to a target.",
  platform: "leetcode",
  title: "Two Sum",
  topics: ["Array"],
  url: "https://leetcode.com/problems/two-sum/",
};
const firstReview: CodeReview = {
  edgeCases: [],
  issues: [],
  model: "test",
  nextStep: "Try a duplicate value case.",
  status: "on-track",
  strengths: ["Uses a lookup structure."],
  summary: "The first review is still visible.",
};

let unmount: (() => void) | undefined;
const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function mount(readCode: () => Promise<CurrentCode>) {
  const container = document.createElement("div");
  const root = createRoot(container);
  document.body.appendChild(container);
  unmount = () => {
    act(() => root.unmount());
    container.remove();
  };
  act(() => {
    root.render(
      <CodeReviewPanel
        isDemo={false}
        problem={problem}
        readCode={readCode}
        teachingStyle="guided"
      />,
    );
  });
  return container;
}

function reviewButton(container: HTMLElement) {
  return container.querySelector<HTMLButtonElement>(".code-review-button")!;
}

beforeEach(() => {
  reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;
  mockedReviewCurrentCode.mockReset();
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  delete reactTestGlobal.IS_REACT_ACT_ENVIRONMENT;
});

describe("CodeReviewPanel", () => {
  it("removes an old review while retrying and after the retry fails", async () => {
    const readCode = vi.fn(
      async (): Promise<CurrentCode> => ({ code: "const answer = 2;" }),
    );
    let rejectRetry!: (reason?: unknown) => void;
    mockedReviewCurrentCode
      .mockResolvedValueOnce(firstReview)
      .mockImplementationOnce(
        () =>
          new Promise<CodeReview>((_, reject) => {
            rejectRetry = reject;
          }),
      );
    const container = mount(readCode);

    await act(async () => {
      reviewButton(container).click();
    });
    expect(container.querySelector(".code-review-result")?.textContent).toContain(
      "The first review is still visible.",
    );

    readCode.mockResolvedValueOnce({ code: "const answer = 3;" });
    await act(async () => {
      reviewButton(container).click();
      await Promise.resolve();
    });
    expect(container.querySelector(".code-review-result")).toBeNull();

    await act(async () => {
      rejectRetry(new Error("ChatGPT is unavailable."));
      await Promise.resolve();
    });
    expect(container.querySelector(".code-review-result")).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "ChatGPT is unavailable.",
    );
  }, 15_000);
});
