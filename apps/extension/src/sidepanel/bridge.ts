import type {
  AnswerFeedback,
  AuthState,
  CodeReview,
  DirectAnswer,
  ExtensionMessage,
  InterviewStage,
  Problem,
  ProblemChatStreamRequest,
  ProblemChatTurn,
  TeachingStyle,
  TutoringSession,
} from "../types";
import { PROBLEM_CHAT_STREAM_PORT } from "../types";
import { consumeProblemChatPort } from "./chat-stream";

interface MessageResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function request<T>(message: ExtensionMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<T>;
  if (!response?.ok) {
    throw new Error(response?.error ?? "ProblemPrism background request failed.");
  }
  return response.data as T;
}

export const authStatus = () =>
  request<AuthState>({ type: "PROBLEM_PRISM_AUTH_STATUS" });

export const beginAuth = () =>
  request<AuthState>({ type: "PROBLEM_PRISM_AUTH_BEGIN" });

export const pollAuth = () =>
  request<AuthState>({ type: "PROBLEM_PRISM_AUTH_POLL" });

export const logoutAuth = () =>
  request<AuthState>({ type: "PROBLEM_PRISM_AUTH_LOGOUT" });

export const generateTutoringSession = (
  problem: Problem,
  teachingStyle: TeachingStyle,
) =>
  request<TutoringSession>({
    type: "PROBLEM_PRISM_GENERATE",
    problem,
    teachingStyle,
  });

export const reviewAnswer = (
  problem: Problem,
  teachingStyle: TeachingStyle,
  stage: InterviewStage,
  answer: string,
) =>
  request<AnswerFeedback>({
    type: "PROBLEM_PRISM_REVIEW_ANSWER",
    problem,
    teachingStyle,
    stage,
    answer,
  });

export const reviewCurrentCode = (
  problem: Problem,
  teachingStyle: TeachingStyle,
  code: string,
) =>
  request<CodeReview>({
    type: "PROBLEM_PRISM_REVIEW_CODE",
    problem,
    teachingStyle,
    code,
  });

export const getDirectAnswer = (
  problem: Problem,
  teachingStyle: TeachingStyle,
  currentCode?: string,
) =>
  request<DirectAnswer>({
    type: "PROBLEM_PRISM_DIRECT_ANSWER",
    problem,
    teachingStyle,
    currentCode,
  });

export const streamProblemQuestion = (
  problem: Problem,
  teachingStyle: TeachingStyle,
  messages: ProblemChatTurn[],
  onDelta: (content: string, model: string) => void,
) => {
  const request: ProblemChatStreamRequest = {
    type: "start",
    problem,
    teachingStyle,
    messages,
  };
  const port = chrome.runtime.connect({ name: PROBLEM_CHAT_STREAM_PORT });
  return consumeProblemChatPort(
    port,
    request,
    onDelta,
    () => chrome.runtime.lastError?.message,
  );
};
