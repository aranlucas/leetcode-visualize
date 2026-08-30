import { describe, expect, it } from "vitest";
import {
  demoAnswerFeedback,
  demoCodeReview,
  demoCurrentCode,
  demoDirectAnswer,
  demoProblem,
  demoSession,
} from "../sidepanel/demo";
import {
  answerFeedbackSchema,
  answerReviewRequestSchema,
  codeReviewRequestSchema,
  codeReviewSchema,
  directAnswerRequestSchema,
  directAnswerSchema,
  problemChatRequestSchema,
  tutoringSessionSchema,
} from "./schema";

describe("tutoring session schema", () => {
  it("accepts the five-stage demo session and rich pipeline visualization", () => {
    const result = tutoringSessionSchema.safeParse(demoSession);
    expect(result.success).toBe(true);
    expect(demoSession.stages.map((stage) => stage.id)).toEqual([
      "understand",
      "notice",
      "explore",
      "plan",
      "explain",
    ]);
    expect(demoSession.visualization?.kind).toBe("pipeline");
    expect(demoSession.visualization?.steps[0]?.processStages).toHaveLength(3);
  });
});

describe("current code review schema", () => {
  it("accepts the structured demo review", () => {
    expect(codeReviewSchema.safeParse(demoCodeReview).success).toBe(true);
  });

  it("accepts a meaningful editor snapshot", () => {
    expect(
      codeReviewRequestSchema.safeParse({
        code: demoCurrentCode.code,
        problem: demoProblem,
        teachingStyle: "guided",
      }).success,
    ).toBe(true);
  });
});

describe("answer feedback schema", () => {
  it("accepts structured critique for the demo", () => {
    expect(answerFeedbackSchema.safeParse(demoAnswerFeedback).success).toBe(
      true,
    );
  });

  it("requires a meaningful written answer", () => {
    const result = answerReviewRequestSchema.safeParse({
      answer: "I",
      problem: demoProblem,
      stage: demoSession.stages[0],
      teachingStyle: "guided",
    });

    expect(result.success).toBe(false);
  });
});

describe("direct answer schema", () => {
  it("accepts the complete demo answer", () => {
    expect(directAnswerSchema.safeParse(demoDirectAnswer).success).toBe(true);
  });

  it("accepts an optional current editor snapshot", () => {
    expect(
      directAnswerRequestSchema.safeParse({
        currentCode: demoCurrentCode.code,
        problem: demoProblem,
        teachingStyle: "guided",
      }).success,
    ).toBe(true);
  });
});

describe("problem chat schema", () => {
  it("accepts an alternating conversation ending with the learner", () => {
    expect(
      problemChatRequestSchema.safeParse({
        messages: [
          { role: "user", content: "What does the constraint tell me?" },
          { role: "assistant", content: "It rules out checking every pair." },
          { role: "user", content: "What should I track instead?" },
        ],
        problem: demoProblem,
        teachingStyle: "guided",
      }).success,
    ).toBe(true);
  });

  it("rejects consecutive learner turns", () => {
    expect(
      problemChatRequestSchema.safeParse({
        messages: [
          { role: "user", content: "First question" },
          { role: "user", content: "Second question" },
        ],
        problem: demoProblem,
        teachingStyle: "guided",
      }).success,
    ).toBe(false);
  });
});
