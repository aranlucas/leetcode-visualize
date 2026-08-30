import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installLeetCodeFormatter } from "./formatter-installer";

describe("installLeetCodeFormatter", () => {
  beforeEach(() => {
    vi.stubGlobal("chrome", {
      runtime: {
        getURL: (path: string) => `chrome-extension://problem-prism/${path}`,
      },
    });
  });

  it("loads only the formatter entry point at document idle", async () => {
    const dom = new JSDOM("<!doctype html><head></head><body></body>");
    const installation = installLeetCodeFormatter(dom.window.document);

    const first = dom.window.document.querySelector<HTMLScriptElement>("script");
    expect(first?.dataset.problemPrismFormatter).toBe("formatter/script.js");
    expect(first?.type).toBe("module");
    first?.dispatchEvent(new dom.window.Event("load"));

    await expect(installation).resolves.toBeUndefined();
    expect(dom.window.document.querySelectorAll("script")).toHaveLength(1);
    expect(first?.dataset.problemPrismFormatterReady).toBe("true");
  });

  it("does not install twice", async () => {
    const dom = new JSDOM(
      `<!doctype html><head>
        <script
          data-problem-prism-formatter="formatter/script.js"
          data-problem-prism-formatter-ready="true"
        ></script>
      </head>`,
    );

    await installLeetCodeFormatter(dom.window.document);

    expect(dom.window.document.querySelectorAll("script")).toHaveLength(1);
  });

  it("cleans up a partial install so a failed asset can be retried", async () => {
    const dom = new JSDOM("<!doctype html><head></head><body></body>");
    const document = dom.window.document;
    const installation = installLeetCodeFormatter(document);

    const first = document.querySelector<HTMLScriptElement>("script");
    expect(first?.dataset.problemPrismFormatter).toBe("formatter/script.js");
    first?.dispatchEvent(new dom.window.Event("error"));

    await expect(installation).rejects.toThrow(
      "Unable to load formatter asset: formatter/script.js",
    );
    expect(
      document.querySelectorAll("script[data-problem-prism-formatter]"),
    ).toHaveLength(0);

    const retry = installLeetCodeFormatter(document);
    const retryFirst = document.querySelector<HTMLScriptElement>("script");
    retryFirst?.dispatchEvent(new dom.window.Event("load"));

    await expect(retry).resolves.toBeUndefined();
    expect(
      document.querySelector(
        'script[data-problem-prism-formatter-ready="true"]',
      ),
    ).not.toBeNull();
  });
});
