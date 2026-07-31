import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { extractEditorCode, extractProblem } from "./extractor";

describe("extractProblem", () => {
  it("extracts a LeetCode problem and normalizes its title", () => {
    const dom = new JSDOM(
      `<!doctype html>
       <title>1. Two Sum - LeetCode</title>
       <main>
         <h1>1. Two Sum</h1>
         <span>Easy</span>
         <div data-track-load="description_content">
           Given an array of integers nums and an integer target, return the two indices.
         </div>
       </main>`,
      { url: "https://leetcode.com/problems/two-sum/" },
    );

    expect(extractProblem(dom.window.document, dom.window.location)).toMatchObject({
      platform: "leetcode",
      title: "Two Sum",
      difficulty: "Easy",
      description: "Given an array of integers nums and an integer target, return the two indices.",
    });
  });

  it("extracts a NeetCode problem", () => {
    const dom = new JSDOM(
      `<!doctype html>
       <title>Duplicate Integer | NeetCode</title>
       <main><h1>Duplicate Integer</h1><p>Determine if any value appears more than once.</p></main>`,
      { url: "https://neetcode.io/problems/duplicate-integer" },
    );

    expect(extractProblem(dom.window.document, dom.window.location)).toMatchObject({
      platform: "neetcode",
      title: "Duplicate Integer",
    });
  });

  it("ignores non-problem pages", () => {
    const dom = new JSDOM("<main><h1>Problems</h1></main>", {
      url: "https://leetcode.com/problemset/",
    });
    expect(extractProblem(dom.window.document, dom.window.location)).toBeNull();
  });
});

describe("extractEditorCode", () => {
  it("reads the full accessible Monaco editor value", () => {
    const dom = new JSDOM(
      `<textarea aria-label="Code editor" class="inputarea"></textarea>`,
    );
    const editor = dom.window.document.querySelector("textarea")!;
    editor.value =
      "class Solution {\n  public int solve() {\n    return 1;\n  }\n}\n";

    expect(extractEditorCode(dom.window.document)).toBe(
      "class Solution {\n  public int solve() {\n    return 1;\n  }\n}",
    );
  });

  it("prefers the most complete editor representation", () => {
    const dom = new JSDOM(
      `<textarea class="inputarea">short</textarea>
       <div class="cm-content">function solve() {
  return true;
}</div>`,
    );

    expect(extractEditorCode(dom.window.document)).toContain(
      "function solve()",
    );
  });

  it("returns undefined when no editor code is available", () => {
    const dom = new JSDOM("<main>No editor here</main>");
    expect(extractEditorCode(dom.window.document)).toBeUndefined();
  });
});
