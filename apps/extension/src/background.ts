import { createChatGPT } from "@opencoredev/loginwithchatgpt-ai";
import {
  type ChatGPTTokens,
  type DeviceCode,
  ChatGPTAuthError,
  exchangeDeviceAuthorization,
  parseUser,
  pollDeviceCode,
  requestDeviceCode,
  resolveConfig,
} from "@opencoredev/loginwithchatgpt-core";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import {
  ANSWER_FEEDBACK_SYSTEM_PROMPT,
  answerFeedbackPrompt,
  CODE_REVIEW_SYSTEM_PROMPT,
  codeReviewPrompt,
  DIRECT_ANSWER_SYSTEM_PROMPT,
  directAnswerPrompt,
  PROBLEM_CHAT_SYSTEM_PROMPT,
  problemChatPrompt,
  TUTORING_SYSTEM_PROMPT,
  tutoringPrompt,
} from "./ai/prompt";
import {
  answerFeedbackSchema,
  answerReviewRequestSchema,
  cachedTutoringSessionSchema,
  codeReviewRequestSchema,
  codeReviewSchema,
  directAnswerRequestSchema,
  directAnswerSchema,
  problemSchema,
  problemChatRequestSchema,
  tutoringSessionSchema,
} from "./ai/schema";
import { sanitizeCodeReview } from "./ai/code-review-policy";
import {
  findTutoringSessionInCache,
  normalizeTutoringSessionCache,
  putTutoringSessionInCache,
  SESSION_CACHE_STORAGE_KEY,
  tutoringSessionCacheKey,
  type TutoringSessionCache,
} from "./ai/session-cache";
import type {
  AnswerFeedback,
  AuthState,
  CodeReview,
  DirectAnswer,
  ExtensionMessage,
  ProblemChatStreamEvent,
  ProblemChatStreamRequest,
  TeachingStyle,
  TutoringSession,
} from "./types";
import { PROBLEM_CHAT_STREAM_PORT } from "./types";
import {
  supportsProblemPage,
  tabScopedSidePanelPath,
} from "./tab-scope";

const TOKENS_KEY = "problemPrism.chatgptTokens";
const PENDING_KEY = "problemPrism.pendingLogin";
const RETRY_REMINDERS_KEY = "problemPrism.retryReminders.v1";
const RETRY_ALARM_PREFIX = "problem-prism-retry:";
const RETRY_DELAY_MS = 24 * 60 * 60 * 1_000;
const config = resolveConfig();
const pendingTutoringSessions = new Map<
  string,
  Promise<TutoringSession>
>();
let sessionCacheWrite = Promise.resolve();

type BackgroundResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

interface RetryReminder {
  notified: boolean;
  reminderAt: number;
  title: string;
  url: string;
}

type RetryReminders = Record<string, RetryReminder>;

function retryReminderId(url: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${RETRY_ALARM_PREFIX}${(hash >>> 0).toString(36)}`;
}

async function readRetryReminders(): Promise<RetryReminders> {
  const stored = await chrome.storage.local.get(RETRY_REMINDERS_KEY);
  const reminders = stored[RETRY_REMINDERS_KEY];
  return reminders && typeof reminders === "object"
    ? (reminders as RetryReminders)
    : {};
}

async function writeRetryReminders(
  reminders: RetryReminders,
): Promise<void> {
  await chrome.storage.local.set({ [RETRY_REMINDERS_KEY]: reminders });
}

async function scheduleRetryReminder(
  title: string,
  url: string,
): Promise<number> {
  const reminderAt = Date.now() + RETRY_DELAY_MS;
  const id = retryReminderId(url);
  const reminders = await readRetryReminders();
  reminders[id] = { notified: false, reminderAt, title, url };
  await writeRetryReminders(reminders);
  await chrome.alarms.create(id, { when: reminderAt });
  return reminderAt;
}

async function restoreRetryReminders(): Promise<void> {
  const reminders = await readRetryReminders();
  await Promise.all(
    Object.entries(reminders).flatMap(([id, reminder]) =>
      reminder.notified
        ? []
        : [
            chrome.alarms.create(id, {
              when: Math.max(reminder.reminderAt, Date.now() + 1_000),
            }),
          ],
    ),
  );
}

async function showRetryReminder(id: string): Promise<void> {
  const reminders = await readRetryReminders();
  const reminder = reminders[id];
  if (!reminder) return;
  reminders[id] = { ...reminder, notified: true };
  await writeRetryReminders(reminders);
  await chrome.notifications.create(id, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon-128.png"),
    title: `Try ${reminder.title} again`,
    message: "Solve it once more without looking at the answer.",
    buttons: [{ title: "Open problem" }],
    priority: 0,
  });
}

async function openRetryReminder(id: string): Promise<void> {
  const reminders = await readRetryReminders();
  const reminder = reminders[id];
  if (!reminder) return;
  await chrome.tabs.create({ url: reminder.url });
  delete reminders[id];
  await Promise.all([
    writeRetryReminders(reminders),
    chrome.notifications.clear(id),
  ]);
}

async function configureTabPanel(
  tabId: number,
  url?: string,
): Promise<void> {
  const tabUrl = url ?? (await chrome.tabs.get(tabId)).url;
  const current = await chrome.sidePanel.getOptions({ tabId });
  if (supportsProblemPage(tabUrl)) {
    const path = tabScopedSidePanelPath(tabId);
    if (current.enabled && current.path === path) return;
    await chrome.sidePanel.setOptions({ enabled: true, path, tabId });
    return;
  }
  if (current.enabled === false) return;
  await chrome.sidePanel.setOptions({ enabled: false, tabId });
}

async function configureExtension() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  await restoreRetryReminders();
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.flatMap((tab) =>
      typeof tab.id === "number"
        ? [configureTabPanel(tab.id, tab.url).catch(() => undefined)]
        : [],
    ),
  );
}

chrome.runtime.onInstalled.addListener(() => {
  void configureExtension();
});

chrome.runtime.onStartup.addListener(() => {
  void configureExtension();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void configureTabPanel(tabId).catch(() => undefined);
});

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.url || change.status === "complete") {
    void configureTabPanel(tabId, change.url ?? tab.url).catch(() => undefined);
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith(RETRY_ALARM_PREFIX)) {
    void showRetryReminder(alarm.name);
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith(RETRY_ALARM_PREFIX)) {
    void openRetryReminder(notificationId);
  }
});

chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    if (
      buttonIndex === 0 &&
      notificationId.startsWith(RETRY_ALARM_PREFIX)
    ) {
      void openRetryReminder(notificationId);
    }
  },
);

chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  if (!byUser || !notificationId.startsWith(RETRY_ALARM_PREFIX)) return;
  void readRetryReminders().then(async (reminders) => {
    delete reminders[notificationId];
    await writeRetryReminders(reminders);
  });
});

void configureExtension();

async function getTokens(): Promise<ChatGPTTokens | undefined> {
  const stored = await chrome.storage.local.get(TOKENS_KEY);
  return stored[TOKENS_KEY] as ChatGPTTokens | undefined;
}

async function saveTokens(tokens: ChatGPTTokens): Promise<void> {
  await chrome.storage.local.set({ [TOKENS_KEY]: tokens });
}

async function getPending(): Promise<DeviceCode | undefined> {
  const stored = await chrome.storage.session.get(PENDING_KEY);
  return stored[PENDING_KEY] as DeviceCode | undefined;
}

async function savePending(device: DeviceCode): Promise<void> {
  await chrome.storage.session.set({ [PENDING_KEY]: device });
}

async function clearPending(): Promise<void> {
  await chrome.storage.session.remove(PENDING_KEY);
}

function publicUser(tokens: ChatGPTTokens) {
  const user = parseUser(tokens.idToken);
  if (!user) return undefined;
  return {
    email: user.email,
    name: user.name,
    plan: user.plan,
  };
}

async function authState(): Promise<AuthState> {
  const tokens = await getTokens();
  if (tokens) {
    return {
      status: "authenticated",
      user: publicUser(tokens),
    };
  }

  const pending = await getPending();
  if (!pending) return { status: "unauthenticated" };
  if (Date.now() >= pending.expiresAt) {
    await clearPending();
    return { status: "expired" };
  }

  return {
    status: "pending",
    pending: {
      userCode: pending.userCode,
      verificationUrl: pending.verificationUrl,
      interval: pending.interval,
      expiresAt: pending.expiresAt,
    },
  };
}

async function beginAuth(): Promise<AuthState> {
  const existing = await authState();
  if (existing.status === "authenticated" || existing.status === "pending") {
    return existing;
  }

  const device = await requestDeviceCode(config);
  await savePending(device);
  await chrome.tabs.create({ url: device.verificationUrl });
  return authState();
}

async function advanceAuth(): Promise<AuthState> {
  const pending = await getPending();
  if (!pending) return authState();
  if (Date.now() >= pending.expiresAt) {
    await clearPending();
    return { status: "expired" };
  }

  const result = await pollDeviceCode(config, pending);
  if (result.status === "pending") return authState();

  const tokens = await exchangeDeviceAuthorization(config, result);
  await saveTokens(tokens);
  await clearPending();
  return {
    status: "authenticated",
    user: publicUser(tokens),
  };
}

async function logout(): Promise<AuthState> {
  await Promise.all([
    chrome.storage.local.remove([TOKENS_KEY, SESSION_CACHE_STORAGE_KEY]),
    chrome.storage.session.remove(PENDING_KEY),
  ]);
  return { status: "unauthenticated" };
}

async function chatGPTModel() {
  const storedTokens = await getTokens();
  if (!storedTokens) throw new Error("Connect your ChatGPT account first.");

  const chatgpt = createChatGPT({
    credentials: async () => {
      const current = await getTokens();
      if (!current) throw new Error("Your ChatGPT session is no longer connected.");
      return current;
    },
    onRefresh: saveTokens,
  });

  const models = await chatgpt.listModels();
  const model =
    models.find((candidate) => candidate === "gpt-5.5") ??
    models.find((candidate) => candidate.startsWith("gpt-5")) ??
    models[0];
  if (!model) throw new Error("No compatible ChatGPT model is available for this account.");

  return { chatgpt, model };
}

async function readTutoringSessionCache(): Promise<TutoringSessionCache> {
  const stored = await chrome.storage.local.get(SESSION_CACHE_STORAGE_KEY);
  return normalizeTutoringSessionCache(stored[SESSION_CACHE_STORAGE_KEY]);
}

async function cachedTutoringSession(
  key: string,
): Promise<TutoringSession | undefined> {
  const cache = await readTutoringSessionCache();
  const session = findTutoringSessionInCache(cache, key);
  if (!session) return undefined;
  const parsed = cachedTutoringSessionSchema.safeParse(session);
  return parsed.success ? parsed.data : undefined;
}

async function cacheTutoringSession(
  key: string,
  session: TutoringSession,
): Promise<void> {
  const write = sessionCacheWrite.then(async () => {
    const cache = await readTutoringSessionCache();
    const next = putTutoringSessionInCache(cache, {
      cachedAt: Date.now(),
      key,
      session,
    });
    await chrome.storage.local.set({ [SESSION_CACHE_STORAGE_KEY]: next });
  });
  sessionCacheWrite = write.catch(() => undefined);
  await write;
}

async function createTutoringSession(
  rawProblem: unknown,
  teachingStyle: TeachingStyle,
): Promise<TutoringSession> {
  const parsed = problemSchema.safeParse(rawProblem);
  if (!parsed.success) throw new Error("The problem data was incomplete or invalid.");

  const key = await tutoringSessionCacheKey(parsed.data, teachingStyle);
  const cached = await cachedTutoringSession(key);
  if (cached) return cached;

  const pending = pendingTutoringSessions.get(key);
  if (pending) return pending;

  const generation = (async () => {
    const { chatgpt, model } = await chatGPTModel();
    const result = streamText({
      model: chatgpt(model),
      system: TUTORING_SYSTEM_PROMPT,
      prompt: tutoringPrompt(parsed.data, teachingStyle),
      output: Output.object({
        name: "interview_tutoring_session",
        description:
          "A five-stage interview-thinking path, progressive hints, and an optional visualization.",
        schema: tutoringSessionSchema,
      }),
    });
    const output = await result.output;
    const session = {
      ...output,
      visualization: output.visualization
        ? { ...output.visualization, model }
        : null,
      model,
    };
    await cacheTutoringSession(key, session);
    return session;
  })();
  pendingTutoringSessions.set(key, generation);
  try {
    return await generation;
  } finally {
    pendingTutoringSessions.delete(key);
  }
}

async function createAnswerFeedback(input: {
  answer: unknown;
  problem: unknown;
  stage: unknown;
  teachingStyle: unknown;
}): Promise<AnswerFeedback> {
  const parsed = answerReviewRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Write at least a short answer before requesting feedback.");
  }

  const { chatgpt, model } = await chatGPTModel();
  const result = streamText({
    model: chatgpt(model),
    system: ANSWER_FEEDBACK_SYSTEM_PROMPT,
    prompt: answerFeedbackPrompt(parsed.data),
    output: Output.object({
      name: "interview_answer_feedback",
      description:
        "Specific critique and a clearer rewrite of the learner's interview reasoning.",
      schema: answerFeedbackSchema,
    }),
  });
  const output = await result.output;
  return { ...output, model };
}

async function createCodeReview(input: {
  code: unknown;
  problem: unknown;
  teachingStyle: unknown;
}): Promise<CodeReview> {
  const parsed = codeReviewRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      "ProblemPrism could not read enough code from the current editor.",
    );
  }

  const { chatgpt, model } = await chatGPTModel();
  const result = streamText({
    model: chatgpt(model),
    system: CODE_REVIEW_SYSTEM_PROMPT,
    prompt: codeReviewPrompt(parsed.data),
    output: Output.object({
      name: "current_code_review",
      description:
        "A specific review of the learner's current editor code with repair hints but no replacement solution.",
      schema: codeReviewSchema,
    }),
  });
  const output = await result.output;
  return sanitizeCodeReview({ ...output, model });
}

async function createDirectAnswer(input: {
  currentCode?: unknown;
  problem: unknown;
  teachingStyle: unknown;
}): Promise<DirectAnswer> {
  const parsed = directAnswerRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("ProblemPrism could not read enough of this problem.");
  }

  const { chatgpt, model } = await chatGPTModel();
  const result = streamText({
    model: chatgpt(model),
    system: DIRECT_ANSWER_SYSTEM_PROMPT,
    prompt: directAnswerPrompt(parsed.data),
    output: Output.object({
      name: "complete_problem_answer",
      description:
        "A complete coding-problem solution with its key insight, explanation, code, and complexity.",
      schema: directAnswerSchema,
    }),
  });
  const output = await result.output;
  const reminderAt = await scheduleRetryReminder(
    parsed.data.problem.title,
    parsed.data.problem.url,
  );
  return { ...output, model, reminderAt };
}

async function streamProblemChatReply(
  input: ProblemChatStreamRequest,
  abortSignal: AbortSignal,
  emit: (event: ProblemChatStreamEvent) => void,
): Promise<void> {
  const parsed = problemChatRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      "That conversation could not be sent. Start a new chat and try again.",
    );
  }

  const { chatgpt, model } = await chatGPTModel();
  emit({ type: "started", model });
  let streamError: unknown;
  let content = "";
  const result = streamText({
    abortSignal,
    model: chatgpt(model),
    onError: ({ error }) => {
      streamError = error;
    },
    system: PROBLEM_CHAT_SYSTEM_PROMPT,
    prompt: problemChatPrompt(parsed.data),
  });

  for await (const delta of result.textStream) {
    if (abortSignal.aborted) return;
    content += delta;
    emit({ type: "delta", delta });
  }

  if (streamError) throw streamError;
  if (!content.trim()) {
    throw new Error("ChatGPT did not return an answer. Please try again.");
  }
}

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case "PROBLEM_PRISM_AUTH_STATUS":
      return authState();
    case "PROBLEM_PRISM_AUTH_BEGIN":
      return beginAuth();
    case "PROBLEM_PRISM_AUTH_POLL":
      return advanceAuth();
    case "PROBLEM_PRISM_AUTH_LOGOUT":
      return logout();
    case "PROBLEM_PRISM_GENERATE":
      return createTutoringSession(message.problem, message.teachingStyle);
    case "PROBLEM_PRISM_REVIEW_ANSWER":
      return createAnswerFeedback(message);
    case "PROBLEM_PRISM_REVIEW_CODE":
      return createCodeReview(message);
    case "PROBLEM_PRISM_DIRECT_ANSWER":
      return createDirectAnswer(message);
    default:
      throw new Error("Unknown ProblemPrism request.");
  }
}

async function backgroundErrorMessage(error: unknown): Promise<string> {
  if (
    error instanceof ChatGPTAuthError &&
    (error.code === "refresh_token_invalid" || error.code === "invalid_token")
  ) {
    await chrome.storage.local.remove(TOKENS_KEY);
  }
  return NoObjectGeneratedError.isInstance(error)
    ? "ChatGPT could not create a valid coaching response. Please try again."
    : error instanceof Error
      ? error.message
      : "The ProblemPrism request failed.";
}

function postChatStreamEvent(
  port: chrome.runtime.Port,
  event: ProblemChatStreamEvent,
): void {
  try {
    port.postMessage(event);
  } catch {
    // The side panel can close while ChatGPT is finishing a response.
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PROBLEM_CHAT_STREAM_PORT) return;

  const abortController = new AbortController();
  let started = false;
  port.onDisconnect.addListener(() => abortController.abort());
  port.onMessage.addListener((message: unknown) => {
    if (
      started ||
      !message ||
      typeof message !== "object" ||
      (message as { type?: unknown }).type !== "start"
    ) {
      return;
    }
    started = true;

    void streamProblemChatReply(
      message as ProblemChatStreamRequest,
      abortController.signal,
      (event) => postChatStreamEvent(port, event),
    )
      .then(() => {
        if (!abortController.signal.aborted) {
          postChatStreamEvent(port, { type: "done" });
        }
      })
      .catch(async (error: unknown) => {
        if (abortController.signal.aborted) return;
        postChatStreamEvent(port, {
          type: "error",
          error: await backgroundErrorMessage(error),
        });
      });
  });
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (!message.type.startsWith("PROBLEM_PRISM_")) return;

  void handleMessage(message)
    .then((data) => {
      sendResponse({ ok: true, data } satisfies BackgroundResponse<unknown>);
    })
    .catch(async (error: unknown) => {
      sendResponse({
        ok: false,
        error: await backgroundErrorMessage(error),
      } satisfies BackgroundResponse<never>);
    });

  return true;
});
