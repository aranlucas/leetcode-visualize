export type Platform = "leetcode" | "neetcode";

export interface Problem {
  platform: Platform;
  title: string;
  difficulty?: string;
  topics: string[];
  description: string;
  selectedText?: string;
  url: string;
}

export type VisualizationKind =
  | "array"
  | "graph"
  | "grid"
  | "linked-list"
  | "pipeline"
  | "string"
  | "tree"
  | "sequence";

export interface VisualItem {
  id: string;
  label: string;
  value: string;
  index: number | null;
  row: number | null;
  column: number | null;
  x: number | null;
  y: number | null;
}

export interface VisualEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  directed: boolean;
}

export interface VisualVariable {
  name: string;
  value: string;
}

export interface VisualMetric {
  label: string;
  value: string;
}

export interface VisualProcessStage {
  label: string;
  value: string;
  tokens: string[];
}

export interface VisualBucket {
  key: string;
  values: string[];
}

export interface VisualStep {
  title: string;
  explanation: string;
  activeItemIds: string[];
  activeEdgeIds: string[];
  variables: VisualVariable[];
  metrics: VisualMetric[];
  processStages: VisualProcessStage[];
  buckets: VisualBucket[];
  callout: string;
}

export interface ProgressiveHint {
  level: number;
  title: string;
  content: string;
}

export interface Visualization {
  title: string;
  overview: string;
  kind: VisualizationKind;
  structureLabel: string;
  items: VisualItem[];
  edges: VisualEdge[];
  steps: VisualStep[];
  model: string;
}

export type TeachingStyle = "guided" | "example" | "pattern";

export type InterviewStageId =
  | "understand"
  | "notice"
  | "explore"
  | "plan"
  | "explain";

export interface CoachingSection {
  title: string;
  body: string;
  bullets: string[];
}

export interface InterviewStage {
  id: InterviewStageId;
  title: string;
  objective: string;
  sections: CoachingSection[];
  coachPrompt: string;
  coachingNote: string;
  talkTrack: string;
}

export interface TutoringSession {
  title: string;
  overview: string;
  stages: InterviewStage[];
  hints: ProgressiveHint[];
  visualizationRecommended: boolean;
  visualizationReason: string;
  visualization: Visualization | null;
  model: string;
}

export interface AnswerFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  improvedAnswer: string;
  followUpQuestion: string;
  model: string;
}

export interface CurrentCode {
  code: string;
}

export type CodeReviewStatus = "on-track" | "needs-work" | "bug-likely";

export interface CodeReviewIssue {
  explanation: string;
  hint: string;
  title: string;
}

export interface CodeReview {
  edgeCases: string[];
  issues: CodeReviewIssue[];
  model: string;
  nextStep: string;
  status: CodeReviewStatus;
  strengths: string[];
  summary: string;
}

export interface DirectAnswer {
  approach: string;
  code: string;
  complexity: string;
  explanation: string;
  keyInsight: string;
  model: string;
  reminderAt: number;
}

export type AuthStatus =
  | "authenticated"
  | "error"
  | "expired"
  | "loading"
  | "pending"
  | "unauthenticated";

export interface AuthUser {
  email?: string;
  name?: string;
  plan?: string;
}

export interface PendingLogin {
  userCode: string;
  verificationUrl: string;
  interval: number;
  expiresAt: number;
}

export interface AuthState {
  status: AuthStatus;
  user?: AuthUser;
  pending?: PendingLogin;
  error?: string;
}

export type ExtensionMessage =
  | { type: "PROBLEM_PRISM_GET_PROBLEM" }
  | { type: "PROBLEM_PRISM_GET_SELECTION" }
  | { type: "PROBLEM_PRISM_GET_CODE" }
  | { type: "PROBLEM_PRISM_AUTH_STATUS" }
  | { type: "PROBLEM_PRISM_AUTH_BEGIN" }
  | { type: "PROBLEM_PRISM_AUTH_POLL" }
  | { type: "PROBLEM_PRISM_AUTH_LOGOUT" }
  | {
      type: "PROBLEM_PRISM_GENERATE";
      problem: Problem;
      teachingStyle: TeachingStyle;
    }
  | {
      type: "PROBLEM_PRISM_REVIEW_ANSWER";
      problem: Problem;
      teachingStyle: TeachingStyle;
      stage: InterviewStage;
      answer: string;
    }
  | {
      type: "PROBLEM_PRISM_REVIEW_CODE";
      problem: Problem;
      teachingStyle: TeachingStyle;
      code: string;
    }
  | {
      type: "PROBLEM_PRISM_DIRECT_ANSWER";
      problem: Problem;
      teachingStyle: TeachingStyle;
      currentCode?: string;
    };
