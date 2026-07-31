import { useEffect, useState } from "react";
import type { DirectAnswer, ProgressiveHint } from "../types";
import { BulbIcon, CodeIcon, SparkIcon } from "./icons";

interface Props {
  answer?: DirectAnswer;
  answerError?: string;
  hints: ProgressiveHint[];
  isAnswerPending: boolean;
  onRevealAnswer: () => void;
}

export function HintsPanel({
  answer,
  answerError,
  hints,
  isAnswerPending,
  onRevealAnswer,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => setVisibleCount(0), [hints]);

  return (
    <section className="hints-panel">
      <div className="hint-intro">
        <BulbIcon />
        <div>
          <h2>Take the smallest useful nudge</h2>
          <p>Hints unlock one at a time, from gentle direction to a concrete approach.</p>
        </div>
      </div>
      <ol className="hint-list">
        {hints.slice(0, visibleCount).map((hint) => (
          <li key={hint.level}>
            <span>Hint {hint.level}</span>
            <h3>{hint.title}</h3>
            <p>{hint.content}</p>
          </li>
        ))}
      </ol>
      {visibleCount < hints.length ? (
        <button
          className="hint-button"
          onClick={() => setVisibleCount((count) => count + 1)}
          type="button"
        >
          <BulbIcon />
          {visibleCount === 0 ? "Show me a hint" : "Reveal the next hint"}
        </button>
      ) : (
        <p className="all-hints-shown">That’s every hint. Try turning the idea into your own solution.</p>
      )}

      <section className="direct-answer-section">
        <div className="direct-answer-intro">
          <CodeIcon />
          <div>
            <h2>Need to move on?</h2>
            <p>
              Reveal the complete solution now. ProblemPrism will remind you
              tomorrow to solve this problem again without looking.
            </p>
          </div>
        </div>
        <button
          className="secondary-button direct-answer-button"
          disabled={isAnswerPending || Boolean(answer)}
          onClick={onRevealAnswer}
          type="button"
        >
          {isAnswerPending ? <span className="loader" /> : <SparkIcon />}
          {isAnswerPending
            ? "Building the complete answer…"
            : answer
              ? "Answer revealed"
              : "I just want the answer"}
        </button>

        {answerError ? (
          <div className="code-review-error" role="alert">
            {answerError}
          </div>
        ) : null}

        {answer ? (
          <article className="direct-answer" aria-live="polite">
            <section>
              <span>Key insight</span>
              <p>{answer.keyInsight}</p>
            </section>
            <section>
              <span>Approach</span>
              <p>{answer.approach}</p>
            </section>
            <section>
              <span>Why it works</span>
              <p>{answer.explanation}</p>
            </section>
            <section>
              <span>Complete solution</span>
              <pre tabIndex={0}><code>{answer.code}</code></pre>
            </section>
            <section>
              <span>Complexity</span>
              <p>{answer.complexity}</p>
            </section>
            <p className="retry-reminder-confirmation">
              Retry reminder scheduled for{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(answer.reminderAt)}.
            </p>
          </article>
        ) : null}
      </section>
    </section>
  );
}
