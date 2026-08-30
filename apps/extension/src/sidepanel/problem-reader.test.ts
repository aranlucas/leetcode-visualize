import { describe, expect, it, vi } from "vitest";
import type { Problem } from "../types";
import { readProblemWithRecovery } from "./problem-reader";

const problem: Problem = {
  description: "Find the best answer.",
  platform: "leetcode",
  title: "Example Problem",
  topics: [],
  url: "https://leetcode.com/problems/example/description/",
};

describe("problem page recovery", () => {
  it("reinjects the content script when an already-open tab has no receiver", async () => {
    const requestProblem = vi
      .fn<() => Promise<Problem | null>>()
      .mockRejectedValueOnce(new Error("Receiving end does not exist"))
      .mockResolvedValueOnce(problem);
    const injectContentScript = vi.fn(async () => undefined);

    await expect(
      readProblemWithRecovery({
        injectContentScript,
        requestProblem,
        wait: vi.fn(async () => undefined),
      }),
    ).resolves.toEqual(problem);

    expect(injectContentScript).toHaveBeenCalledOnce();
    expect(requestProblem).toHaveBeenCalledTimes(2);
  });

  it("waits briefly for a client-rendered problem statement", async () => {
    const requestProblem = vi
      .fn<() => Promise<Problem | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(problem);
    const wait = vi.fn(async () => undefined);

    await expect(
      readProblemWithRecovery({
        injectContentScript: vi.fn(async () => undefined),
        requestProblem,
        wait,
      }),
    ).resolves.toEqual(problem);

    expect(wait).toHaveBeenNthCalledWith(1, 150);
    expect(wait).toHaveBeenNthCalledWith(2, 350);
  });

  it("returns null when the content script cannot be restored", async () => {
    await expect(
      readProblemWithRecovery({
        injectContentScript: vi.fn(async () => {
          throw new Error("Injection failed");
        }),
        requestProblem: vi.fn(async () => {
          throw new Error("Receiving end does not exist");
        }),
        wait: vi.fn(async () => undefined),
      }),
    ).resolves.toBeNull();
  });
});
