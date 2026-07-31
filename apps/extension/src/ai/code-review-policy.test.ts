import { describe, expect, it } from "vitest";
import type { CodeReview } from "../types";
import { sanitizeCodeReview } from "./code-review-policy";

const importOnlyReview: CodeReview = {
  edgeCases: ["The smallest valid input"],
  issues: [
    {
      explanation:
        "Arrays.stream is used without a visible java.util.Arrays import.",
      hint: "Add the import when compiling as standalone Java.",
      title: "Missing import may cause compilation failure depending on platform",
    },
  ],
  model: "test",
  nextStep: "Check whether the judge auto-imports java.util.Arrays.",
  status: "bug-likely",
  strengths: ["The binary-search bounds are derived from the input."],
  summary:
    "The algorithm looks sound, but plain Java compilation may fail because an import is missing.",
};

describe("code review policy", () => {
  it("removes platform import boilerplate from a review", () => {
    const sanitized = sanitizeCodeReview(importOnlyReview);

    expect(sanitized.issues).toEqual([]);
    expect(sanitized.status).toBe("on-track");
    expect(sanitized.summary).not.toMatch(/imports?|compilation/i);
    expect(sanitized.nextStep).toContain("The smallest valid input");
  });

  it("preserves actionable algorithmic issues", () => {
    const review: CodeReview = {
      ...importOnlyReview,
      issues: [
        importOnlyReview.issues[0],
        {
          explanation: "The lower bound never advances when the rate is too slow.",
          hint: "Check which side of the search interval can be discarded.",
          title: "Binary search can stall",
        },
      ],
    };

    const sanitized = sanitizeCodeReview(review);

    expect(sanitized.issues).toHaveLength(1);
    expect(sanitized.issues[0]?.title).toBe("Binary search can stall");
    expect(sanitized.status).toBe("bug-likely");
  });
});
