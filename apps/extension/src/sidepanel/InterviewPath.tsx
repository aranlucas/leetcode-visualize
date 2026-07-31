import type { InterviewStageId } from "../types";

export const STAGE_ORDER: InterviewStageId[] = [
  "understand",
  "notice",
  "explore",
  "plan",
  "explain",
];

export const STAGE_LABELS: Record<InterviewStageId, string> = {
  understand: "Understand",
  notice: "Notice",
  explore: "Explore",
  plan: "Plan",
  explain: "Explain",
};

interface Props {
  activeIndex: number;
  furthestIndex: number;
  onSelect: (index: number) => void;
}

export function InterviewPath({ activeIndex, furthestIndex, onSelect }: Props) {
  return (
    <ol className="interview-path" aria-label="Interview coaching progress">
      {STAGE_ORDER.map((id, index) => {
        const unlocked = index <= furthestIndex;
        const active = index === activeIndex;
        return (
          <li className={active ? "active" : unlocked ? "unlocked" : ""} key={id}>
            <button
              aria-current={active ? "step" : undefined}
              disabled={!unlocked}
              onClick={() => onSelect(index)}
              type="button"
            >
              <span>{index + 1}</span>
              {STAGE_LABELS[id]}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
