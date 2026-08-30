import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Problem } from "../types";
import { ProblemHeader } from "./ProblemHeader";

const problem: Problem = {
  description: "Find two values that add to the target.",
  platform: "leetcode",
  title: "Two Sum",
  topics: ["Array", "Hash Table"],
  url: "https://leetcode.com/problems/two-sum/",
};

describe("ProblemHeader", () => {
  it("keeps every problem action reachable in compact mode", () => {
    const html = renderToStaticMarkup(
      <ProblemHeader
        compact
        isRefreshing={false}
        onRefresh={vi.fn()}
        onUseSelection={vi.fn()}
        problem={problem}
      />,
    );

    expect(html).toContain('aria-label="Refresh detected problem"');
    expect(html).toContain('aria-label="Open Two Sum in a new tab"');
    expect(html).toContain('aria-label="Use highlighted question text"');
    expect(html).toContain("Use highlighted text");
  });
});
