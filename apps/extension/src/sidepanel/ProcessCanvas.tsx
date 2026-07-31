import type { Visualization } from "../types";
import { ArrowIcon } from "./icons";

interface Props {
  stepIndex: number;
  visualization: Visualization;
}

export function ProcessCanvas({ stepIndex, visualization }: Props) {
  const step = visualization.steps[stepIndex];
  if (!step) return null;

  return (
    <div className="process-canvas">
      {visualization.items.length ? (
        <div className="example-input">
          <span>{visualization.structureLabel}</span>
          <strong>
            {visualization.items.map((item) => item.value).join(", ")}
          </strong>
        </div>
      ) : null}

      {step.metrics.length ? (
        <dl className="process-metrics">
          {step.metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {step.processStages.length ? (
        <section className="process-section">
          <h3>What happens in this step</h3>
          <div className="process-flow">
            {step.processStages.map((processStage, index) => (
              <div className="process-flow-part" key={`${processStage.label}-${index}`}>
                {index > 0 ? (
                  <span className="process-arrow" aria-hidden="true">
                    <ArrowIcon direction="right" />
                  </span>
                ) : null}
                <article>
                  <span>{index + 1}. {processStage.label}</span>
                  {processStage.tokens.length ? (
                    <div className="process-tokens">
                      {processStage.tokens.map((token, tokenIndex) => (
                        <strong key={`${token}-${tokenIndex}`}>{token}</strong>
                      ))}
                    </div>
                  ) : (
                    <strong className="process-value">{processStage.value}</strong>
                  )}
                </article>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {step.buckets.length ? (
        <section className="bucket-section">
          <div className="bucket-heading">
            <h3>State so far</h3>
            <span>key → values</span>
          </div>
          <div className="bucket-list">
            {step.buckets.map((bucket) => (
              <article key={bucket.key}>
                <div>
                  <strong>{bucket.key}</strong>
                  <span>{bucket.values.length} {bucket.values.length === 1 ? "item" : "items"}</span>
                </div>
                <div className="bucket-values">
                  {bucket.values.map((value, valueIndex) => (
                    <span key={`${value}-${valueIndex}`}>{value}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {step.callout ? (
        <p className="process-callout">{step.callout}</p>
      ) : null}
    </div>
  );
}
