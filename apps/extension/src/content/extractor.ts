import type { Platform, Problem } from "../types";

const DESCRIPTION_SELECTORS = [
  "[data-track-load='description_content']",
  "[data-cy='question-content']",
  "[class*='elfjS']",
  "article",
  "main",
];

const TITLE_SELECTORS = [
  "[data-cy='question-title']",
  "a[href*='/problems/'][class*='text-title']",
  "h1",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

function compactText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstText(document: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const text = compactText(document.querySelector(selector)?.textContent);
    if (text) return text;
  }
  return "";
}

function meta(document: Document, property: string): string {
  return compactText(
    document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.content ??
      document.querySelector<HTMLMetaElement>(`meta[name="${property}"]`)?.content,
  );
}

function detectDifficulty(document: Document): string | undefined {
  const candidates = Array.from(document.querySelectorAll("div, span, p"))
    .slice(0, 1200)
    .map((node) => compactText(node.textContent))
    .filter((text) => text.length <= 16);
  return DIFFICULTIES.find((difficulty) => candidates.includes(difficulty));
}

function detectTopics(document: Document): string[] {
  const topicContainers = [
    "[data-cy='topic-tags']",
    "[class*='topic']",
    "[class*='tag']",
  ];
  const topics = new Set<string>();
  for (const selector of topicContainers) {
    for (const node of document.querySelectorAll(selector)) {
      const text = compactText(node.textContent);
      if (text && text.length <= 36 && !DIFFICULTIES.includes(text)) topics.add(text);
      if (topics.size >= 6) return [...topics];
    }
  }
  return [...topics];
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^\d+\.\s*/, "")
    .replace(/\s*[-|]\s*(LeetCode|NeetCode).*$/i, "")
    .trim();
}

function detectPlatform(location: Location): Platform {
  return location.hostname.includes("neetcode") ? "neetcode" : "leetcode";
}

export function extractProblem(document: Document, location: Location): Problem | null {
  const pathLooksLikeProblem = /\/problems\/[^/]+/.test(location.pathname);
  if (!pathLooksLikeProblem) return null;

  const title = cleanTitle(
    firstText(document, TITLE_SELECTORS) ||
      meta(document, "og:title") ||
      document.title,
  );
  const description = compactText(
    firstText(document, DESCRIPTION_SELECTORS) || meta(document, "og:description"),
  ).slice(0, 18_000);

  if (!title || !description) return null;

  return {
    platform: detectPlatform(location),
    title,
    difficulty: detectDifficulty(document),
    topics: detectTopics(document),
    description,
    selectedText: compactText(document.getSelection()?.toString()).slice(0, 6_000) || undefined,
    url: location.href,
  };
}

export function getSelectedText(document: Document): string | undefined {
  return compactText(document.getSelection()?.toString()).slice(0, 6_000) || undefined;
}

export function extractEditorCode(document: Document): string | undefined {
  const selectors = [
    "textarea[aria-label='Code editor']",
    "textarea[aria-label='Code Editor']",
    "textarea.inputarea",
    ".cm-content",
    ".CodeMirror-code",
    ".monaco-editor .view-lines",
  ];
  const candidates: string[] = [];

  for (const selector of selectors) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const raw =
        element.tagName === "TEXTAREA"
          ? (element as HTMLTextAreaElement).value
          : element.innerText || element.textContent || "";
      const code = raw
        .replace(/\r\n?/g, "\n")
        .replace(/\u200b/g, "")
        .trimEnd();
      if (code.trim()) candidates.push(code);
    }
  }

  return candidates
    .sort((left, right) => right.length - left.length)[0]
    ?.slice(0, 20_000);
}
