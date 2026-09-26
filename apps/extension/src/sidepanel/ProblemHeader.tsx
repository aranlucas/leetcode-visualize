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
  const refreshButton = (
    <button
      aria-label="Refresh detected problem"
      className="icon-button"
      disabled={isRefreshing}
      onClick={onRefresh}
      title="Refresh detected problem"
      type="button"
    >
      <RefreshIcon className={isRefreshing ? "spin" : undefined} />
    </button>
  );
  const externalLink = (
    <a
      aria-label={`Open ${problem.title} in a new tab`}
      className="icon-button"
      href={problem.url}
      rel="noreferrer"
      target="_blank"
      title={`Open ${problem.title} in a new tab`}
    >
      <ExternalIcon />
    </a>
  );

  return (
    <section
      className={compact ? "problem-header compact" : "problem-header"}
      aria-labelledby="problem-title"
    >
      <div className="title-row">
        <h1 id="problem-title">{problem.title}</h1>
        {problem.difficulty ? (
          <span className={`tag difficulty-${problem.difficulty.toLowerCase()}`}>
            {problem.difficulty}
          </span>
        ) : null}
      </div>
      <details className="problem-details">
        <summary>Problem details &amp; tools</summary>
        <div className="problem-tools">
          <span className="problem-platform">
            {problem.platform === "leetcode" ? "LeetCode" : "NeetCode"}
          </span>
          {refreshButton}
          {externalLink}
        </div>
        <div className="tags" aria-label="Problem topics">
          {problem.topics.map((topic) => <span className="tag" key={topic}>{topic}</span>)}
        </div>
        <button
          aria-label="Use highlighted question text"
          aria-pressed={Boolean(problem.selectedText)}
          className="selection-button"
          onClick={onUseSelection}
          type="button"
        >
          Use highlighted text
        </button>
      </details>
      {problem.selectedText ? (
        <p className="selection-note">Using your highlighted excerpt from the problem.</p>
      ) : null}
    </section>
  );
}
