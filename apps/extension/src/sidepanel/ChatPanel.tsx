import {
  type FormEvent,
  type ReactNode,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ProblemChatMessage } from "../types";
import { SendIcon, SparkIcon } from "./icons";

interface Props {
  error?: string;
  isPending: boolean;
  tools?: ReactNode;
  messages: ProblemChatMessage[];
  onClear: () => void;
  onSend: (question: string) => Promise<boolean>;
  problemTitle: string;
}

const MarkdownMessage = lazy(() =>
  import("./MarkdownMessage").then((module) => ({
    default: module.MarkdownMessage,
  })),
);

export function ChatPanel({
  error,
  isPending,
  tools,
  messages,
  onClear,
  onSend,
  problemTitle,
}: Props) {
  const [draft, setDraft] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) messageList.scrollTop = messageList.scrollHeight;
  }, [messages, isPending]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || isPending) return;
    setDraft("");
    const sent = await onSend(question);
    if (!sent) setDraft(question);
  };

  return (
    <section
      className={`chat-panel ${messages.length ? "has-messages" : ""}`}
      aria-labelledby="problem-chat-heading"
    >
      <header className={`chat-panel-header ${messages.length ? "conversation" : ""}`}>
        <div className="sr-only">
          <h2 id="problem-chat-heading">Ask about {problemTitle}</h2>
        </div>
        {messages.length ? (
          <button className="text-button" onClick={onClear} type="button">
            New chat
          </button>
        ) : null}
      </header>

      <div
        aria-busy={isPending}
        aria-live="polite"
        aria-relevant="additions"
        className="chat-messages"
        ref={messageListRef}
        role="log"
      >
        {
          messages.map((message, index) => {
            const isStreaming =
              isPending &&
              message.role === "assistant" &&
              index === messages.length - 1;
            return (
              <article className={`chat-message ${message.role}`} key={message.id}>
                <span className="chat-message-author">
                  {message.role === "assistant" ? <SparkIcon /> : null}
                  <span className="sr-only">
                    {message.role === "user" ? "You" : "ProblemPrism"}
                  </span>
                </span>
                {message.role === "assistant" ? (
                  <Suspense
                    fallback={<p className="chat-markdown-fallback">{message.content}</p>}
                  >
                    <MarkdownMessage
                      content={message.content}
                      isStreaming={isStreaming}
                    />
                  </Suspense>
                ) : (
                  <p>{message.content}</p>
                )}
              </article>
            );
          })
        }

        {isPending && messages.at(-1)?.role !== "assistant" ? (
          <article className="chat-message assistant pending">
            <span className="chat-message-author">
              <SparkIcon />
              <span className="sr-only">ProblemPrism</span>
            </span>
            <p><i /><i /><i /><span className="sr-only">Thinking</span></p>
          </article>
        ) : null}
      </div>

      {error ? <div className="chat-error" role="alert">{error}</div> : null}

      {tools}

      <footer className="chat-composer-area">
        <form className="chat-composer" onSubmit={(event) => void submit(event)}>
          <label className="sr-only" htmlFor="problem-chat-input">Ask a question about this problem</label>
          <textarea
            disabled={isPending}
            id="problem-chat-input"
            maxLength={3_000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Where are you stuck? Ask or share your thinking…"
            rows={2}
            value={draft}
          />
          <button
            aria-label="Send question"
            disabled={!draft.trim() || isPending}
            type="submit"
          >
            <SendIcon />
          </button>
        </form>
        <p className="chat-privacy">ChatGPT receives the problem and this conversation. Shift + Enter adds a new line.</p>
      </footer>
    </section>
  );
}
