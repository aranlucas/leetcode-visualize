import { useRef, useState } from "react";
import type {
  CodeReview,
  CurrentCode,
  Problem,
  TeachingStyle,
} from "../types";
import { reviewCurrentCode } from "./bridge";
import { demoCodeReview, demoCurrentCode } from "./demo";
import { CodeIcon, SparkIcon } from "./icons";

interface Props {
  isDemo: boolean;
  problem: Problem;
  readCode: () => Promise<CurrentCode>;
  teachingStyle: TeachingStyle;
}

interface ReviewResult {
  code: string;
  review: CodeReview;
}

const STATUS_LABELS: Record<CodeReview["status"], string> = {
  "on-track": "On track",
  "needs-work": "Needs work",
  "bug-likely": "Bug likely",
};

export function CodeReviewPanel({
  isDemo,
  problem,
  readCode,
  teachingStyle,
}: Props) {
  const lastResultRef = useRef<ReviewResult | null>(null);
  const requestRef = useRef(0);
  const [result, setResult] = useState<ReviewResult>();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  const runReview = async () => {
    const requestId = ++requestRef.current;
    setError(undefined);
    setIsPending(true);
    try {
      const current = isDemo ? demoCurrentCode : await readCode();
      if (lastResultRef.current?.code === current.code) {
        setResult(lastResultRef.current);
        return;
      }
      const nextReview = isDemo
        ? demoCodeReview
        : await reviewCurrentCode(problem, teachingStyle, current.code);
      if (requestId !== requestRef.current) return;
      const next = { code: current.code, review: nextReview };
      lastResultRef.current = next;
      setResult(next);
    } catch (reviewFailure) {
      if (requestId !== requestRef.current) return;
      setError(
        reviewFailure instanceof Error
          ? reviewFailure.message
          : "ProblemPrism could not review the current editor.",
      );
    } finally {
      if (requestId === requestRef.current) setIsPending(false);
    }
  };
  const lineCount = result
    ? result.code.split(/\r?\n/).length.toLocaleString()
    : undefined;

  return (
    <section className="code-review-panel">
      <header className="code-review-intro">
        <CodeIcon />
        <div>
          <h2>Check your current code</h2>
          <p>
            Get specific correctness and edge-case feedback without receiving a
            replacement solution.
          </p>
        </div>
      </header>

      <button
        className="primary-button code-review-button"
        disabled={isPending}
        onClick={() => void runReview()}
        type="button"
      >
        {isPending ? <span className="loader light" /> : <SparkIcon />}
        {isPending
          ? "Reading your editor…"
          : result
            ? "Check current code again"
            : "Check my current code"}
      </button>
      <p className="code-review-privacy">
        Your editor code is read and sent directly to ChatGPT only when you
        click. ProblemPrism does not save it.
      </p>

      {error ? (
        <div className="code-review-error" role="alert">
          {error}
        </div>
      ) : null}

      {result ? (
        <article className="code-review-result" aria-live="polite">
          <header>
            <div>
              <span className={`code-status ${result.review.status}`}>
                {STATUS_LABELS[result.review.status]}
              </span>
              <span className="code-read-count">{lineCount} lines reviewed</span>
            </div>
            <p>{result.review.summary}</p>
          </header>

          {result.review.strengths.length ? (
            <section className="code-review-section strengths">
              <h3>What works</h3>
              <ul>
                {result.review.strengths.map((strength) => (
                  <li key={strength}>{strength}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {result.review.issues.length ? (
            <section className="code-review-section issues">
              <h3>Issues to fix</h3>
              <div className="code-issues">
                {result.review.issues.map((issue) => (
                  <article key={issue.title}>
                    <strong>{issue.title}</strong>
                    <p>{issue.explanation}</p>
                    <div>
                      <span>Repair hint</span>
                      {issue.hint}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {result.review.edgeCases.length ? (
            <section className="code-review-section edge-cases">
              <h3>Edge cases to test</h3>
              <ul>
                {result.review.edgeCases.map((edgeCase) => (
                  <li key={edgeCase}>{edgeCase}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="code-next-step">
            <span>Best next step</span>
            <p>{result.review.nextStep}</p>
          </section>
        </article>
      ) : null}
    </section>
  );
}
