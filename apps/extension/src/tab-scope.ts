export function supportsProblemPage(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const supportedHost =
      parsed.hostname === "leetcode.com" ||
      parsed.hostname.endsWith(".leetcode.com") ||
      parsed.hostname === "neetcode.io";
    return supportedHost && /\/problems\/[^/]+/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function problemPageIdentity(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/problems\/([^/]+)/);
    return match ? `${parsed.hostname}:${match[1]}` : undefined;
  } catch {
    return undefined;
  }
}

export function tabScopedSidePanelPath(tabId: number): string {
  return `sidepanel.html?tabId=${tabId}`;
}

export function scopedTabIdFromSearch(search: string): number | undefined {
  const value = Number(new URLSearchParams(search).get("tabId"));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}
