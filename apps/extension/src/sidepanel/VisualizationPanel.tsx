import { useEffect, useState } from "react";
import type { Visualization } from "../types";
import { ArrowIcon, PauseIcon, PlayIcon } from "./icons";
import { VisualCanvas } from "./VisualCanvas";

interface Props {
  visualization: Visualization;
}

export function VisualizationPanel({ visualization }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const steps = visualization.steps;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= steps.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [playing, steps.length]);

  useEffect(() => {
    setStepIndex(0);
    setPlaying(false);
  }, [visualization]);

  const step = steps[stepIndex];

  return (
    <section className="visualization-panel">
      <p aria-atomic="true" aria-live="polite" className="sr-only">
        Visualization step {stepIndex + 1} of {steps.length}: {step.title}
      </p>
      <div className="step-heading">
        <div>
          <span className="step-count">
            Step {stepIndex + 1} of {steps.length}
          </span>
          <h2>{step.title}</h2>
        </div>
        <div className="step-dots" aria-hidden="true">
          {steps.map((_, index) => (
            <span
              className={index <= stepIndex ? "step-dot active" : "step-dot"}
              key={index}
            />
          ))}
        </div>
      </div>
      <p className="step-explanation">{step.explanation}</p>
      <VisualCanvas stepIndex={stepIndex} visualization={visualization} />
      <div className="playback-controls">
        <button
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          type="button"
        >
          <ArrowIcon direction="left" />
          Previous
        </button>
        <button
          className="play-button"
          onClick={() => {
            if (stepIndex === steps.length - 1) setStepIndex(0);
            setPlaying((value) => !value);
          }}
          type="button"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? "Pause" : stepIndex === steps.length - 1 ? "Replay" : "Play"}
        </button>
        <button
          disabled={stepIndex === steps.length - 1}
          onClick={() =>
            setStepIndex((current) => Math.min(steps.length - 1, current + 1))
          }
          type="button"
        >
          Next
          <ArrowIcon direction="right" />
        </button>
      </div>
    </section>
  );
}
