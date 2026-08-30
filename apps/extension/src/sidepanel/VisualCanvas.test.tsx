import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  VisualEdge,
  VisualItem,
  Visualization,
  VisualizationKind,
} from "../types";
import { getGraphPositions, VisualCanvas } from "./VisualCanvas";

function item(
  index: number,
  coordinates?: Pick<VisualItem, "x" | "y">,
): VisualItem {
  return {
    id: `item-${index}`,
    label: String(index),
    value: String(index),
    index: null,
    row: null,
    column: null,
    x: coordinates?.x ?? null,
    y: coordinates?.y ?? null,
  };
}

function visualization(
  kind: VisualizationKind,
  items: VisualItem[],
  edges: VisualEdge[] = [],
): Visualization {
  const step = {
    title: "Step one",
    explanation: "Track the current state.",
    activeItemIds: [],
    activeEdgeIds: [],
    variables: [],
    metrics: [],
    processStages: [],
    buckets: [],
    callout: "",
  };

  return {
    title: "Test visualization",
    overview: "A test visualization.",
    kind,
    structureLabel: "items",
    items,
    edges,
    steps: [step, { ...step, title: "Step two" }],
    model: "test",
  };
}

describe("VisualCanvas", () => {
  it("keeps the schema-maximum graph inside the SVG viewBox", () => {
    const items = Array.from({ length: 16 }, (_, index) => item(index));
    items[0] = item(0, { x: 0, y: 0 });
    items[15] = item(15, { x: 100, y: 100 });

    const positions = getGraphPositions(items);
    for (const position of positions.values()) {
      expect(position.x).toBeGreaterThanOrEqual(12);
      expect(position.x).toBeLessThanOrEqual(88);
      expect(position.y).toBeGreaterThanOrEqual(12);
      expect(position.y).toBeLessThanOrEqual(88);
    }

    const markup = renderToStaticMarkup(
      <VisualCanvas
        stepIndex={0}
        visualization={visualization("graph", items)}
      />,
    );
    expect(markup.match(/<circle /g)).toHaveLength(16);
    expect(markup).toContain('viewBox="0 0 100 100"');
  });

  it("renders arrowheads only for directed graph edges", () => {
    const items = [item(0, { x: 20, y: 50 }), item(1, { x: 80, y: 50 })];
    const edges: VisualEdge[] = [
      {
        id: "directed",
        from: "item-0",
        to: "item-1",
        label: "next",
        directed: true,
      },
      {
        id: "undirected",
        from: "item-1",
        to: "item-0",
        label: "",
        directed: false,
      },
    ];
    const markup = renderToStaticMarkup(
      <VisualCanvas
        stepIndex={0}
        visualization={visualization("graph", items, edges)}
      />,
    );

    expect(markup).toContain('<marker id="graph-arrowhead"');
    expect(markup.match(/marker-end="url\(#graph-arrowhead\)"/g)).toHaveLength(
      1,
    );
  });

  it.each(["array", "grid", "linked-list"] as const)(
    "keeps %s visuals on the non-graph renderer",
    (kind) => {
      const markup = renderToStaticMarkup(
        <VisualCanvas
          stepIndex={0}
          visualization={visualization(kind, [item(0)])}
        />,
      );
      expect(markup).toContain("visual-items");
      expect(markup).not.toContain("graph-canvas");
    },
  );
});
