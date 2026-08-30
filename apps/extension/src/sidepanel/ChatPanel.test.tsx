import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";
import { MarkdownMessage } from "./MarkdownMessage";

describe("problem chat Markdown", () => {
  it("renders assistant Markdown while keeping learner text literal", () => {
    const chatHtml = renderToStaticMarkup(
      <ChatPanel
        isPending={false}
        messages={[{ id: "user", role: "user", content: "Is **this** literal?" }]}
        onClear={vi.fn()}
        onSend={vi.fn(async () => true)}
        problemTitle="Two Sum"
      />,
    );
    const markdownHtml = renderToStaticMarkup(
      <MarkdownMessage
        content={"## Key idea\n\nUse a **hash map**:\n\n- Store earlier values\n- Check the complement"}
        isStreaming={false}
      />,
    );

    expect(chatHtml).toContain("Is **this** literal?");
    expect(markdownHtml).toContain('data-streamdown="heading-2"');
    expect(markdownHtml).toContain('data-streamdown="strong"');
    expect(markdownHtml).toContain('data-streamdown="unordered-list"');
  });

  it("repairs incomplete Markdown during an active stream", () => {
    const html = renderToStaticMarkup(
      <MarkdownMessage
        content="Track the **complement"
        isStreaming
      />,
    );

    expect(html).toContain('data-streamdown="strong"');
    expect(html).toContain("complement");
  });
});
