import { z } from "zod";

export const problemSchema = z.object({
  platform: z.enum(["leetcode", "neetcode"]),
  title: z.string().min(1).max(180),
  difficulty: z.string().max(24).optional(),
  topics: z.array(z.string().max(64)).max(10),
  description: z.string().min(1).max(18_000),
  selectedText: z.string().max(6_000).optional(),
  url: z.string().url().max(1_000),
});

const visualItemSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().max(40),
  value: z.string().max(80),
  index: z.number().int().min(0).max(99).nullable(),
  row: z.number().int().min(0).max(19).nullable(),
  column: z.number().int().min(0).max(19).nullable(),
  x: z.number().min(0).max(100).nullable(),
  y: z.number().min(0).max(100).nullable(),
});

const visualEdgeSchema = z.object({
  id: z.string().min(1).max(40),
  from: z.string().min(1).max(40),
  to: z.string().min(1).max(40),
  label: z.string().max(40),
  directed: z.boolean(),
});

const visualVariableSchema = z.object({
  name: z.string().min(1).max(40),
  value: z.string().max(100),
});

const visualMetricSchema = z.object({
  label: z.string().min(1).max(40),
  value: z.string().max(80),
});

const visualProcessStageSchema = z.object({
  label: z.string().min(1).max(60),
  value: z.string().max(100),
  tokens: z.array(z.string().min(1).max(30)).max(12),
});

const visualBucketSchema = z.object({
  key: z.string().min(1).max(80),
  values: z.array(z.string().min(1).max(80)).max(10),
});

const visualStepSchema = z.object({
  title: z.string().min(1).max(100),
  explanation: z.string().min(1).max(360),
  activeItemIds: z.array(z.string().max(40)).max(16),
  activeEdgeIds: z.array(z.string().max(40)).max(24),
  variables: z.array(visualVariableSchema).max(6),
  metrics: z.array(visualMetricSchema).max(4),
  processStages: z.array(visualProcessStageSchema).max(4),
  buckets: z.array(visualBucketSchema).max(8),
  callout: z.string().max(360),
});

const hintSchema = z.object({
  level: z.number().int().min(1).max(3),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(360),
});

export const visualizationSchema = z.object({
  title: z.string().min(1).max(120),
  overview: z.string().min(1).max(320),
  kind: z.enum(["array", "graph", "grid", "linked-list", "pipeline", "string", "tree", "sequence"]),
  structureLabel: z.string().min(1).max(40),
  items: z.array(visualItemSchema).max(16),
  edges: z.array(visualEdgeSchema).max(24),
  steps: z.array(visualStepSchema).min(2).max(8),
});

const coachingSectionSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(420),
  bullets: z.array(z.string().min(1).max(240)).max(4),
});

export const interviewStageSchema = z.object({
  id: z.enum(["understand", "notice", "explore", "plan", "explain"]),
  title: z.string().min(1).max(80),
  objective: z.string().min(1).max(180),
  sections: z.array(coachingSectionSchema).min(2).max(3),
  coachPrompt: z.string().min(1).max(280),
  coachingNote: z.string().min(1).max(360),
  talkTrack: z.string().min(1).max(320),
});

export const tutoringSessionSchema = z.object({
  title: z.string().min(1).max(120),
  overview: z.string().min(1).max(320),
  stages: z.array(interviewStageSchema).length(5),
  hints: z.array(hintSchema).length(3),
  visualizationRecommended: z.boolean(),
  visualizationReason: z.string().min(1).max(240),
  visualization: visualizationSchema.nullable(),
});

export const cachedTutoringSessionSchema = tutoringSessionSchema.extend({
  model: z.string().min(1).max(120),
  visualization: visualizationSchema
    .extend({ model: z.string().min(1).max(120) })
    .nullable(),
});

export const answerReviewRequestSchema = z.object({
  problem: problemSchema,
  teachingStyle: z.enum(["guided", "example", "pattern"]),
  stage: interviewStageSchema,
  answer: z.string().trim().min(3).max(4_000),
});

export const answerFeedbackSchema = z.object({
  summary: z.string().min(1).max(280),
  strengths: z.array(z.string().min(1).max(240)).max(3),
  improvements: z.array(z.string().min(1).max(280)).min(1).max(4),
  improvedAnswer: z.string().min(1).max(700),
  followUpQuestion: z.string().min(1).max(280),
});

export const codeReviewRequestSchema = z.object({
  problem: problemSchema,
  teachingStyle: z.enum(["guided", "example", "pattern"]),
  code: z.string().trim().min(8).max(20_000),
});

export const codeReviewSchema = z.object({
  status: z.enum(["on-track", "needs-work", "bug-likely"]),
  summary: z.string().min(1).max(360),
  strengths: z.array(z.string().min(1).max(240)).max(3),
  issues: z
    .array(
      z.object({
        title: z.string().min(1).max(100),
        explanation: z.string().min(1).max(320),
        hint: z.string().min(1).max(280),
      }),
    )
    .max(5),
  edgeCases: z.array(z.string().min(1).max(240)).max(4),
  nextStep: z.string().min(1).max(320),
});

export const directAnswerRequestSchema = z.object({
  problem: problemSchema,
  teachingStyle: z.enum(["guided", "example", "pattern"]),
  currentCode: z.string().trim().min(8).max(20_000).optional(),
});

const problemChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(3_000),
});

export const problemChatRequestSchema = z
  .object({
    problem: problemSchema,
    teachingStyle: z.enum(["guided", "example", "pattern"]),
    messages: z.array(problemChatTurnSchema).min(1).max(16),
  })
  .superRefine(({ messages }, context) => {
    messages.forEach((message, index) => {
      const expectedRole = index % 2 === 0 ? "user" : "assistant";
      if (message.role !== expectedRole) {
        context.addIssue({
          code: "custom",
          message: "Chat messages must alternate between learner and coach.",
          path: ["messages", index, "role"],
        });
      }
    });
    if (messages.at(-1)?.role !== "user") {
      context.addIssue({
        code: "custom",
        message: "The latest chat message must come from the learner.",
        path: ["messages"],
      });
    }
  });

export const directAnswerSchema = z.object({
  approach: z.string().min(1).max(500),
  explanation: z.string().min(1).max(1_200),
  code: z.string().min(8).max(20_000),
  complexity: z.string().min(1).max(300),
  keyInsight: z.string().min(1).max(360),
});
