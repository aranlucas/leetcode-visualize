import { useEffect, useRef, useState } from "react";
import type {
  AnswerFeedback,
  Problem,
  TeachingStyle,
  TutoringSession,
} from "../types";
import { reviewAnswer } from "./bridge";
import { AnswerFeedbackPanel } from "./AnswerFeedbackPanel";
import { demoAnswerFeedback } from "./demo";
import { ArrowIcon, EyeIcon, LockIcon, QuestionIcon, SparkIcon } from "./icons";
import { InterviewPath, STAGE_LABELS, STAGE_ORDER } from "./InterviewPath";

interface Props {
  isDemo: boolean;
  problem: Problem;
  session: TutoringSession;
  teachingStyle: TeachingStyle;
}

export function TutorPanel({
  isDemo,
  problem,
  session,
  teachingStyle,
}: Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const [furthestIndex, setFurthestIndex] = useState(0);
  const [revealedNotes, setRevealedNotes] = useState<Set<string>>(() => new Set());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, AnswerFeedback>>({});
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [reviewingStageId, setReviewingStageId] = useState<string>();
  const reviewRequestRef = useRef(0);
  const pathHeadingRef = useRef<HTMLDivElement>(null);
  const stages = STAGE_ORDER.flatMap((id) => {
    const stage = session.stages.find((candidate) => candidate.id === id);
    return stage ? [stage] : [];
  });
  const stage = stages[stageIndex] ?? stages[0];

  useEffect(() => {
    reviewRequestRef.current += 1;
    setStageIndex(0);
    setFurthestIndex(0);
    setRevealedNotes(new Set());
    setAnswers({});
    setFeedback({});
    setReviewErrors({});
    setReviewingStageId(undefined);
  }, [session]);

  if (!stage) return null;

  const revealNote = () => {
    setRevealedNotes((current) => new Set(current).add(stage.id));
  };

  const goToStage = (nextIndex: number) => {
    setStageIndex(nextIndex);
    setFurthestIndex((current) => Math.max(current, nextIndex));
    requestAnimationFrame(() => {
      pathHeadingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const noteRevealed = revealedNotes.has(stage.id);
  const nextStage = stages[stageIndex + 1];
  const answer = answers[stage.id] ?? "";
  const isReviewing = reviewingStageId === stage.id;

  const submitAnswer = async () => {
    const reviewStage = stage;
    const requestId = ++reviewRequestRef.current;
    setReviewErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[reviewStage.id];
      return nextErrors;
    });
    setReviewingStageId(reviewStage.id);
    try {
      const next = isDemo
        ? demoAnswerFeedback
        : await reviewAnswer(problem, teachingStyle, reviewStage, answer);
      if (requestId !== reviewRequestRef.current) return;
      setFeedback((current) => ({
        ...current,
        [reviewStage.id]: next,
      }));
    } catch (reviewFailure) {
      if (requestId !== reviewRequestRef.current) return;
      setReviewErrors((current) => ({
        ...current,
        [reviewStage.id]:
          reviewFailure instanceof Error
            ? reviewFailure.message
            : "ChatGPT could not review this answer.",
      }));
    } finally {
      if (requestId === reviewRequestRef.current) {
        setReviewingStageId(undefined);
      }
    }
  };

  return (
    <section className="tutor-panel">
      <div className="path-heading" ref={pathHeadingRef}>
        <h2>Your interview path</h2>
        <span>{stageIndex + 1} of {stages.length}</span>
      </div>
      <InterviewPath
        activeIndex={stageIndex}
        furthestIndex={furthestIndex}
        onSelect={goToStage}
      />

      <article className="coaching-stage" aria-live="polite">
        <header className="coaching-stage-header">
          <span>{stageIndex + 1}</span>
          <div>
            <h2>{stage.title}</h2>
            <p>{stage.objective}</p>
          </div>
        </header>

        <div className="coaching-sections">
          {stage.sections.map((section) => (
            <section className="coaching-section" key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
              {section.bullets.length ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>
                      <QuestionIcon />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <aside className="coach-prompt">
          <SparkIcon />
          <div>
            <strong>Coach prompt</strong>
            <p>{stage.coachPrompt}</p>
          </div>
        </aside>

        <AnswerFeedbackPanel
          answer={answer}
          error={reviewErrors[stage.id]}
          feedback={feedback[stage.id]}
          isReviewing={isReviewing}
          onAnswerChange={(next) => {
            setAnswers((current) => ({ ...current, [stage.id]: next }));
            setFeedback((current) => {
              const nextFeedback = { ...current };
              delete nextFeedback[stage.id];
              return nextFeedback;
            });
            setReviewErrors((current) => {
              const nextErrors = { ...current };
              delete nextErrors[stage.id];
              return nextErrors;
            });
          }}
          onSubmit={() => void submitAnswer()}
        />

        {noteRevealed ? (
          <div className="coaching-note">
            <strong>What to notice</strong>
            <p>{stage.coachingNote}</p>
            <div className="say-aloud">
              <span>Say it aloud</span>
              “{stage.talkTrack}”
            </div>
          </div>
        ) : null}

        <div className="coaching-controls">
          <button
            className="secondary-button"
            disabled={stageIndex === 0}
            onClick={() => goToStage(Math.max(0, stageIndex - 1))}
            type="button"
          >
            <ArrowIcon direction="left" />
            Previous
          </button>
          <button
            className="reveal-note-button"
            disabled={noteRevealed}
            onClick={revealNote}
            type="button"
          >
            <EyeIcon />
            {noteRevealed ? "Nudge shown" : "Give me a nudge"}
          </button>
          <button
            className="primary-button"
            disabled={!nextStage}
            onClick={() => {
              if (nextStage) goToStage(stageIndex + 1);
            }}
            type="button"
          >
            {nextStage ? `Next: ${STAGE_LABELS[nextStage.id]}` : "Path complete"}
            {nextStage ? <ArrowIcon direction="right" /> : null}
          </button>
        </div>

        <p className="no-code-note">
          <LockIcon />
          No code yet — build the reasoning first.
        </p>
      </article>
    </section>
  );
}
