// Keep the document-idle payload small. The entry point loads the formatter
// for the active language only when the learner clicks Format.
const FORMATTER_ENTRY = {
  path: "formatter/script.js",
  type: "module",
} as const;
const FORMATTER_SCRIPT_SELECTOR = "script[data-problem-prism-formatter]";
const FORMATTER_READY_ATTRIBUTE = "data-problem-prism-formatter-ready";

function formatterScripts(document: Document): HTMLScriptElement[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(FORMATTER_SCRIPT_SELECTOR),
  );
}

function formatterIsInstalled(document: Document): boolean {
  const scripts = formatterScripts(document);
  return (
    scripts.some(
      (script) =>
        script.getAttribute(FORMATTER_READY_ATTRIBUTE) === "true" &&
        script.dataset.problemPrismFormatter === FORMATTER_ENTRY.path,
    ) &&
    scripts.some(
      (script) => script.dataset.problemPrismFormatter === FORMATTER_ENTRY.path,
    )
  );
}

function removeFormatterScripts(document: Document): void {
  for (const script of formatterScripts(document)) {
    script.remove();
  }
}

function injectScript(document: Document, path: string, type: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(path);
    script.type = type;
    script.dataset.problemPrismFormatter = path;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error(`Unable to load formatter asset: ${path}`)),
      { once: true },
    );
    (document.head ?? document.documentElement).appendChild(script);
  });
}

export async function installLeetCodeFormatter(document: Document): Promise<void> {
  if (formatterIsInstalled(document)) return;

  // A previous attempt may have left one or more loaded scripts behind. They
  // are not a usable formatter until every asset has loaded, so start clean.
  removeFormatterScripts(document);

  try {
    await injectScript(document, FORMATTER_ENTRY.path, FORMATTER_ENTRY.type);

    const finalScript = formatterScripts(document).find(
      (script) =>
        script.dataset.problemPrismFormatter === FORMATTER_ENTRY.path,
    );
    if (!finalScript) {
      throw new Error("Formatter installation marker could not be created");
    }
    finalScript.setAttribute(FORMATTER_READY_ATTRIBUTE, "true");
  } catch (error) {
    // Do not let a failed asset load leave a marker that suppresses retries.
    removeFormatterScripts(document);
    throw error;
  }
}
