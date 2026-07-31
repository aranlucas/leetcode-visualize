import { describe, expect, it } from "vitest";
import { demoProblem, demoSession } from "../sidepanel/demo";
import {
  emptyTutoringSessionCache,
  findTutoringSessionInCache,
  normalizeTutoringSessionCache,
  putTutoringSessionInCache,
  SESSION_CACHE_MAX_AGE_MS,
  SESSION_CACHE_MAX_ENTRIES,
  tutoringSessionCacheKey,
} from "./session-cache";

describe("tutoring session cache", () => {
  it("reuses identical inputs and invalidates on focus or style changes", async () => {
    const guided = await tutoringSessionCacheKey(demoProblem, "guided");
    expect(await tutoringSessionCacheKey(demoProblem, "guided")).toBe(guided);
    expect(await tutoringSessionCacheKey(demoProblem, "example")).not.toBe(
      guided,
    );
    expect(
      await tutoringSessionCacheKey(
        { ...demoProblem, selectedText: "Can this be done in one pass?" },
        "guided",
      ),
    ).not.toBe(guided);
  });

  it("removes expired entries", () => {
    const now = Date.now();
    const cache = normalizeTutoringSessionCache(
      {
        version: 1,
        entries: [
          {
            cachedAt: now - SESSION_CACHE_MAX_AGE_MS - 1,
            key: "expired",
            session: demoSession,
          },
          { cachedAt: now, key: "current", session: demoSession },
        ],
      },
      now,
    );

    expect(cache.entries.map((entry) => entry.key)).toEqual(["current"]);
    expect(findTutoringSessionInCache(cache, "current")).toEqual(demoSession);
    expect(findTutoringSessionInCache(cache, "expired")).toBeUndefined();
  });

  it("keeps the newest bounded set and replaces duplicate keys", () => {
    const now = Date.now();
    let cache = emptyTutoringSessionCache();
    for (let index = 0; index <= SESSION_CACHE_MAX_ENTRIES; index += 1) {
      cache = putTutoringSessionInCache(
        cache,
        {
          cachedAt: now + index,
          key: `key-${index}`,
          session: demoSession,
        },
        now + index,
      );
    }
    cache = putTutoringSessionInCache(
      cache,
      { cachedAt: now + 100, key: "key-24", session: demoSession },
      now + 100,
    );

    expect(cache.entries).toHaveLength(SESSION_CACHE_MAX_ENTRIES);
    expect(cache.entries[0]?.key).toBe("key-24");
    expect(cache.entries.filter((entry) => entry.key === "key-24")).toHaveLength(
      1,
    );
    expect(cache.entries.some((entry) => entry.key === "key-0")).toBe(false);
  });
});
