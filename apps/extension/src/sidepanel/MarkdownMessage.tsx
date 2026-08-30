import { Streamdown } from "streamdown";
import "streamdown/styles.css";

interface Props {
  content: string;
  isStreaming: boolean;
}

const directLinkSafety = { enabled: false } as const;

export function MarkdownMessage({ content, isStreaming }: Props) {
  return (
    <Streamdown
      caret="circle"
      className="chat-markdown"
      controls={false}
      isAnimating={isStreaming}
      lineNumbers={false}
      linkSafety={directLinkSafety}
      mode={isStreaming ? "streaming" : "static"}
    >
      {content}
    </Streamdown>
  );
}
