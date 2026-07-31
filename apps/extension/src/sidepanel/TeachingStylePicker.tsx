import type { TeachingStyle } from "../types";
import { ExampleIcon, PatternIcon, QuestionIcon } from "./icons";

export const TEACHING_STYLES: Array<{
  id: TeachingStyle;
  label: string;
  description: string;
  icon: typeof QuestionIcon;
}> = [
  {
    id: "guided",
    label: "Guide me",
    description: "Question-led coaching",
    icon: QuestionIcon,
  },
  {
    id: "example",
    label: "Show an example",
    description: "Learn from a small walkthrough",
    icon: ExampleIcon,
  },
  {
    id: "pattern",
    label: "Teach the pattern",
    description: "Recognize the reusable idea",
    icon: PatternIcon,
  },
];

interface Props {
  onChange: (style: TeachingStyle) => void;
  value: TeachingStyle;
}

export function TeachingStylePicker({ onChange, value }: Props) {
  return (
    <section className="teaching-style-section" aria-labelledby="teaching-style-title">
      <h2 id="teaching-style-title">How do you want to learn?</h2>
      <div className="teaching-style-options">
        {TEACHING_STYLES.map((style) => {
          const Icon = style.icon;
          const selected = value === style.id;
          return (
            <button
              aria-pressed={selected}
              className={selected ? "teaching-style selected" : "teaching-style"}
              key={style.id}
              onClick={() => onChange(style.id)}
              type="button"
            >
              <span className="style-radio" aria-hidden="true">
                <span />
              </span>
              <span className="style-icon">
                <Icon />
              </span>
              <span className="style-copy">
                <strong>{style.label}</strong>
                <span>{style.description}</span>
              </span>
              <span className="style-chevron" aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
