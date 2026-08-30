import { describe, expect, it } from "vitest";
import {
  problemPageIdentity,
  scopedTabIdFromSearch,
  supportsProblemPage,
  tabScopedSidePanelPath,
} from "./tab-scope";

describe("tab-scoped side panel", () => {
  it("recognizes supported problem pages only", () => {
    expect(
      supportsProblemPage("https://leetcode.com/problems/two-sum/"),
    ).toBe(true);
    expect(
      supportsProblemPage(
        "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/description/",
      ),
    ).toBe(true);
    expect(supportsProblemPage("https://leetcode.cn/problems/two-sum/")).toBe(
      true,
    );
    expect(
      supportsProblemPage("https://cn.leetcode.cn/problems/two-sum/"),
    ).toBe(true);
    expect(
      supportsProblemPage("https://neetcode.io/problems/two-integer-sum"),
    ).toBe(true);
    expect(supportsProblemPage("https://leetcode.com/problemset/")).toBe(false);
    expect(supportsProblemPage("https://example.com/problems/two-sum/")).toBe(
      false,
    );
  });

  it("round-trips a valid tab id through the panel path", () => {
    const path = tabScopedSidePanelPath(321);
    expect(path).toBe("sidepanel.html?tabId=321");
    expect(scopedTabIdFromSearch(new URL(path, "chrome-extension://id/").search))
      .toBe(321);
  });

  it("rejects invalid tab ids", () => {
    expect(scopedTabIdFromSearch("?tabId=-1")).toBeUndefined();
    expect(scopedTabIdFromSearch("?tabId=not-a-number")).toBeUndefined();
    expect(scopedTabIdFromSearch("")).toBeUndefined();
  });

  it("treats sections of the same problem as one panel identity", () => {
    expect(
      problemPageIdentity("https://leetcode.com/problems/two-sum/"),
    ).toBe(
      problemPageIdentity(
        "https://leetcode.com/problems/two-sum/solutions/?envType=study-plan",
      ),
    );
    expect(
      problemPageIdentity("https://leetcode.com/problems/three-sum/"),
    ).not.toBe(
      problemPageIdentity("https://leetcode.com/problems/two-sum/"),
    );
  });
});
