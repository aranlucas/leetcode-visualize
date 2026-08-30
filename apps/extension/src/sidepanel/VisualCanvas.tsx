import type { VisualItem, Visualization } from "../types";
import { ProcessCanvas } from "./ProcessCanvas";

const GRAPH_VIEWBOX_SIZE = 100;
const GRAPH_NODE_RADIUS = 8;
const GRAPH_LAYOUT_MIN = GRAPH_NODE_RADIUS + 4;
const GRAPH_LAYOUT_MAX = GRAPH_VIEWBOX_SIZE - GRAPH_LAYOUT_MIN;
const GRAPH_ARROW_MARKER_ID = "graph-arrowhead";

interface GraphPosition {
  x: number;
  y: number;
}

function clampGraphCoordinate(value: number, fallback: number): number {
  const coordinate = Number.isFinite(value) ? value : fallback;
  return Math.min(GRAPH_LAYOUT_MAX, Math.max(GRAPH_LAYOUT_MIN, coordinate));
}

function fallbackGraphPosition(index: number, itemCount: number): GraphPosition {
  if (itemCount === 0) {
    return { x: GRAPH_VIEWBOX_SIZE / 2, y: GRAPH_VIEWBOX_SIZE / 2 };
  }

  const columns = Math.min(4, Math.ceil(Math.sqrt(itemCount)));
  const rows = Math.ceil(itemCount / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x =
    columns === 1
      ? GRAPH_VIEWBOX_SIZE / 2
      : GRAPH_LAYOUT_MIN +
        (column / (columns - 1)) * (GRAPH_LAYOUT_MAX - GRAPH_LAYOUT_MIN);
  const y =
    rows === 1
      ? GRAPH_VIEWBOX_SIZE / 2
      : GRAPH_LAYOUT_MIN +
        (row / (rows - 1)) * (GRAPH_LAYOUT_MAX - GRAPH_LAYOUT_MIN);

  return { x, y };
}

export function getGraphPositions(
  items: VisualItem[],
): Map<string, GraphPosition> {
  return new Map(
    items.map((item, index) => {
      const fallback = fallbackGraphPosition(index, items.length);
      return [
        item.id,
        {
          x: clampGraphCoordinate(item.x ?? fallback.x, fallback.x),
          y: clampGraphCoordinate(item.y ?? fallback.y, fallback.y),
        },
      ];
    }),
  );
}

function edgePoints(from: GraphPosition, to: GraphPosition): {
  from: GraphPosition;
  to: GraphPosition;
} {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (!distance) return { from, to };

  const gap = Math.min(GRAPH_NODE_RADIUS + 1, distance / 2);
  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  return {
    from: {
      x: from.x + unitX * gap,
      y: from.y + unitY * gap,
    },
    to: {
      x: to.x - unitX * gap,
      y: to.y - unitY * gap,
    },
  };
}

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
  const positions = getGraphPositions(visualization.items);

  return (
    <svg
      aria-label={`${visualization.kind} visualization`}
      className="graph-canvas"
      role="img"
      viewBox="0 0 100 100"
    >
      <defs>
        <marker
          id={GRAPH_ARROW_MARKER_ID}
          markerHeight="6"
          markerUnits="userSpaceOnUse"
          markerWidth="6"
          orient="auto"
          refX="6"
          refY="0"
          viewBox="0 -3 6 6"
        >
          <path d="M0,-3 L6,0 L0,3 Z" fill="#b5b8c2" />
        </marker>
      </defs>
      {visualization.edges.map((edge) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return null;
        const isActive = activeEdges.has(edge.id);
        const points = edgePoints(from, to);
        return (
          <g className={isActive ? "graph-edge active" : "graph-edge"} key={edge.id}>
            <line
              markerEnd={edge.directed ? `url(#${GRAPH_ARROW_MARKER_ID})` : undefined}
              x1={points.from.x}
              x2={points.to.x}
              y1={points.from.y}
              y2={points.to.y}
            />
            {edge.label ? (
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 2}>
                {edge.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {visualization.items.map((item, index) => {
        const position =
          positions.get(item.id) ??
          fallbackGraphPosition(index, visualization.items.length);
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
