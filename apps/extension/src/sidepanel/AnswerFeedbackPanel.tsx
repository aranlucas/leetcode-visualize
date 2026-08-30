import type { AnswerFeedback } from "../types";
import { SparkIcon } from "./icons";

interface Props {
  answer: string;
  error?: string;
  feedback?: AnswerFeedback;
  isReviewing: boolean;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
}

export function AnswerFeedbackPanel({
  answer,
  error,
  feedback,
  isReviewing,
  onAnswerChange,
  onSubmit,
}: Props) {
  return (
    <section className="answer-coach" aria-labelledby="practice-answer-title">
      <div className="answer-coach-heading">
        <div>
          <h3 id="practice-answer-title">Practice your answer</h3>
          <p>Write what you would say to the interviewer.</p>
        </div>
        <SparkIcon />
      </div>
      <textarea
        aria-label="Your interview answer"
        maxLength={4_000}
        onChange={(event) => onAnswerChange(event.target.value)}
        placeholder="Explain your thinking in your own words…"
        rows={5}
        value={answer}
      />
      <div className="answer-actions">
        <span>{answer.length.toLocaleString()} / 4,000</span>
        <button
          className="primary-button"
          disabled={answer.trim().length < 3 || isReviewing}
          onClick={onSubmit}
          type="button"
        >
          {isReviewing ? <span className="loader light" /> : <SparkIcon />}
          {isReviewing ? "Reading your answer…" : "Help me improve"}
        </button>
      </div>
      <p className="answer-privacy">
        Your answer is sent directly to ChatGPT for this critique and is not
        saved by ProblemPrism.
      </p>

      {error ? <div className="answer-error" role="alert">{error}</div> : null}

      {feedback ? (
        <article className="answer-feedback">
          <p aria-live="polite" className="sr-only">
            Feedback from ChatGPT is ready.
          </p>
          <header>
            <span>Feedback from ChatGPT</span>
            <p>{feedback.summary}</p>
          </header>

          {feedback.strengths.length ? (
            <section className="feedback-points strengths">
              <h4>What works</h4>
              <ul>
                {feedback.strengths.map((strength) => (
                  <li key={strength}>{strength}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="feedback-points improvements">
            <h4>What to improve</h4>
            <ul>
              {feedback.improvements.map((improvement) => (
                <li key={improvement}>{improvement}</li>
              ))}
            </ul>
          </section>

          <section className="stronger-answer">
            <h4>A stronger version</h4>
            <blockquote>{feedback.improvedAnswer}</blockquote>
          </section>

          <section className="feedback-follow-up">
            <span>Try this next</span>
            <p>{feedback.followUpQuestion}</p>
          </section>
        </article>
      ) : null}
    </section>
  );
}
