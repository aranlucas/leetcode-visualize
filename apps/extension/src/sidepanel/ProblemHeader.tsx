import type { Problem } from "../types";
import { ExternalIcon, RefreshIcon } from "./icons";

interface Props {
  problem: Problem;
  isRefreshing: boolean;
  onRefresh: () => void;
  onUseSelection: () => void;
  compact?: boolean;
}

export function ProblemHeader({
  compact = false,
  problem,
  isRefreshing,
  onRefresh,
  onUseSelection,
}: Props) {
  return (
    <section
      className={compact ? "problem-header compact" : "problem-header"}
      aria-labelledby="problem-title"
    >
      {!compact ? (
        <div className="section-label-row">
          <span className="section-label">
            Detected on {problem.platform === "leetcode" ? "LeetCode" : "NeetCode"}
          </span>
          <button
            aria-label="Refresh detected problem"
            className="icon-button"
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            <RefreshIcon className={isRefreshing ? "spin" : undefined} />
          </button>
        </div>
      ) : null}
      <div className="title-row">
        <div>
          <h1 id="problem-title">{problem.title}</h1>
          <div className="tags" aria-label="Problem metadata">
            {problem.difficulty ? (
              <span className={`tag difficulty-${problem.difficulty.toLowerCase()}`}>
                {problem.difficulty}
              </span>
            ) : null}
            {problem.topics.slice(0, 3).map((topic) => (
              <span className="tag" key={topic}>
                {topic}
              </span>
            ))}
          </div>
        </div>
        {!compact ? (
          <a
            aria-label={`Open ${problem.title} in a new tab`}
            className="icon-button"
            href={problem.url}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalIcon />
          </a>
        ) : null}
      </div>
      {!compact ? (
        <>
          <button className="selection-button" onClick={onUseSelection} type="button">
            Use highlighted question text
          </button>
          {problem.selectedText ? (
            <p className="selection-note">Using your highlighted excerpt from the problem.</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
