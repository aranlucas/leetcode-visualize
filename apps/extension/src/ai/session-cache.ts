import type { Problem, TeachingStyle, TutoringSession } from "../types";

export const SESSION_CACHE_STORAGE_KEY =
  "problemPrism.tutoringSessionCache.v1";
export const SESSION_CACHE_MAX_ENTRIES = 24;
export const SESSION_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

const SESSION_CACHE_INPUT_VERSION = 1;

export interface TutoringSessionCacheEntry {
  cachedAt: number;
  key: string;
  session: TutoringSession;
}

export interface TutoringSessionCache {
  entries: TutoringSessionCacheEntry[];
  version: 1;
}

export const emptyTutoringSessionCache = (): TutoringSessionCache => ({
  entries: [],
  version: 1,
});

function canonicalProblemUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return value;
  }
}

export async function tutoringSessionCacheKey(
  problem: Problem,
  teachingStyle: TeachingStyle,
): Promise<string> {
  const input = JSON.stringify({
    version: SESSION_CACHE_INPUT_VERSION,
    teachingStyle,
    problem: {
      platform: problem.platform,
      title: problem.title,
      difficulty: problem.difficulty ?? "",
      topics: [...problem.topics].sort(),
      description: problem.description,
      selectedText: problem.selectedText ?? "",
      url: canonicalProblemUrl(problem.url),
    },
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function normalizeTutoringSessionCache(
  value: unknown,
  now = Date.now(),
): TutoringSessionCache {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("entries" in value) ||
    !Array.isArray(value.entries)
  ) {
    return emptyTutoringSessionCache();
  }

  const entries = value.entries
    .filter(
      (entry): entry is TutoringSessionCacheEntry =>
        Boolean(
          entry &&
            typeof entry === "object" &&
            "key" in entry &&
            typeof entry.key === "string" &&
            "cachedAt" in entry &&
            typeof entry.cachedAt === "number" &&
            "session" in entry &&
            entry.session &&
            typeof entry.session === "object" &&
            now - entry.cachedAt <= SESSION_CACHE_MAX_AGE_MS,
        ),
    )
    .sort((left, right) => right.cachedAt - left.cachedAt)
    .slice(0, SESSION_CACHE_MAX_ENTRIES);

  return { entries, version: 1 };
}

export function putTutoringSessionInCache(
  cache: TutoringSessionCache,
  entry: TutoringSessionCacheEntry,
  now = Date.now(),
): TutoringSessionCache {
  return normalizeTutoringSessionCache(
    {
      entries: [
        entry,
        ...cache.entries.filter((candidate) => candidate.key !== entry.key),
      ],
      version: 1,
    },
    now,
  );
}

export function findTutoringSessionInCache(
  cache: TutoringSessionCache,
  key: string,
): TutoringSession | undefined {
  return cache.entries.find((entry) => entry.key === key)?.session;
}
