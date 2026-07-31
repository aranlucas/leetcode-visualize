import type { VisualItem, Visualization } from "../types";
import { ProcessCanvas } from "./ProcessCanvas";

interface Props {
  visualization: Visualization;
  stepIndex: number;
}

function GraphCanvas({
  visualization,
  activeItems,
  activeEdges,
}: {
  visualization: Visualization;
  activeItems: Set<string>;
  activeEdges: Set<string>;
}) {
  const fallbackPosition = (item: VisualItem, index: number) => ({
    x: item.x ?? 18 + (index % 3) * 32,
    y: item.y ?? 22 + Math.floor(index / 3) * 30,
  });
  const positions = new Map(
    visualization.items.map((item, index) => [item.id, fallbackPosition(item, index)]),
  );

  return (
    <svg
      aria-label={`${visualization.kind} visualization`}
      className="graph-canvas"
      role="img"
      viewBox="0 0 100 100"
    >
      {visualization.edges.map((edge) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return null;
        const isActive = activeEdges.has(edge.id);
        return (
          <g className={isActive ? "graph-edge active" : "graph-edge"} key={edge.id}>
            <line x1={from.x} x2={to.x} y1={from.y} y2={to.y} />
            {edge.label ? (
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 2}>
                {edge.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {visualization.items.map((item, index) => {
        const position = fallbackPosition(item, index);
        const isActive = activeItems.has(item.id);
        return (
          <g className={isActive ? "graph-node active" : "graph-node"} key={item.id}>
            <circle cx={position.x} cy={position.y} r="8" />
            <text x={position.x} y={position.y + 1.3}>
              {item.value || item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function VisualCanvas({ visualization, stepIndex }: Props) {
  const step = visualization.steps[stepIndex];
  const activeItems = new Set(step?.activeItemIds ?? []);
  const activeEdges = new Set(step?.activeEdgeIds ?? []);
  const isGraph =
    visualization.kind === "graph" || visualization.kind === "tree";
  const isGrid = visualization.kind === "grid";

  if (visualization.kind === "pipeline") {
    return (
      <ProcessCanvas
        stepIndex={stepIndex}
        visualization={visualization}
      />
    );
  }

  return (
    <div className="visual-canvas">
      <span className="structure-label">{visualization.structureLabel}</span>
      {isGraph ? (
        <GraphCanvas
          activeEdges={activeEdges}
          activeItems={activeItems}
          visualization={visualization}
        />
      ) : (
        <div className={isGrid ? "visual-items grid-items" : "visual-items"}>
          {visualization.items.map((item) => (
            <div
              className={activeItems.has(item.id) ? "visual-item active" : "visual-item"}
              key={item.id}
              style={
                isGrid && item.column !== null && item.row !== null
                  ? { gridColumn: item.column + 1, gridRow: item.row + 1 }
                  : undefined
              }
            >
              <span className="item-index">
                {item.index ?? (item.label !== item.value ? item.label : "")}
              </span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}
      {step?.variables.length ? (
        <dl className="variables">
          {step.variables.map((variable) => (
            <div key={`${variable.name}-${variable.value}`}>
              <dt>{variable.name}</dt>
              <dd>{variable.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
