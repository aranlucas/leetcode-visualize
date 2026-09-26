import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CurrentCode,
  DirectAnswer,
  Problem,
  ProblemChatMessage,
  TeachingStyle,
  TutoringSession,
} from "../types";
import {
  problemPageIdentity,
  scopedTabIdFromSearch,
} from "../tab-scope";
import { AuthGate } from "./AuthGate";
import { ChatPanel } from "./ChatPanel";
import { CodeReviewPanel } from "./CodeReviewPanel";
import {
  generateTutoringSession,
  getDirectAnswer,
  streamProblemQuestion,
} from "./bridge";
import {
  demoDirectAnswer,
  demoProblem,
  demoSession,
} from "./demo";
import { EyeIcon, LogoMark } from "./icons";
import { HintsPanel } from "./HintsPanel";
import { ProblemHeader } from "./ProblemHeader";
import { readProblemWithRecovery } from "./problem-reader";
import { TutorPanel } from "./TutorPanel";
import { useProblemPrismAuth } from "./useProblemPrismAuth";
import { VisualizationPanel } from "./VisualizationPanel";

const teachingStyle: TeachingStyle = "guided";

const searchParams = new URLSearchParams(window.location.search);
const isDemo = searchParams.has("demo");
const isSetupDemo = isDemo && searchParams.has("setup");
const scopedTabId = scopedTabIdFromSearch(window.location.search);

async function activeTabId(): Promise<number | undefined> {
  if (scopedTabId) return scopedTabId;
  if (!globalThis.chrome?.tabs) return undefined;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function readProblem(): Promise<Problem | null> {
  const tabId = await activeTabId();
  if (!tabId) return null;

  return readProblemWithRecovery({
    injectContentScript: async () => {
      if (!globalThis.chrome?.scripting) {
        throw new Error("Chrome scripting is unavailable.");
      }
      await chrome.scripting.executeScript({
        files: ["assets/content.js"],
        target: { tabId },
      });
    },
    requestProblem: async () => {
      const response = (await chrome.tabs.sendMessage(tabId, {
        type: "PROBLEM_PRISM_GET_PROBLEM",
      })) as { problem?: Problem | null };
      return response.problem ?? null;
    },
    wait: (milliseconds) =>
      new Promise((resolve) => window.setTimeout(resolve, milliseconds)),
  });
}

function extractCodeFromPage(): string | undefined {
  const selectors = [
    "textarea[aria-label='Code editor']",
    "textarea[aria-label='Code Editor']",
    "textarea.inputarea",
    ".cm-content",
    ".CodeMirror-code",
    ".monaco-editor .view-lines",
  ];
  const candidates: string[] = [];
  for (const selector of selectors) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const raw =
        element.tagName === "TEXTAREA"
          ? (element as HTMLTextAreaElement).value
          : element.innerText || element.textContent || "";
      const code = raw
        .replace(/\r\n?/g, "\n")
        .replace(/\u200b/g, "")
        .trimEnd();
      if (code.trim()) candidates.push(code);
    }
  }
  return candidates
    .sort((left, right) => right.length - left.length)[0]
    ?.slice(0, 20_000);
}

async function readCurrentCode(): Promise<CurrentCode> {
  const tabId = await activeTabId();
  if (!tabId) throw new Error("ProblemPrism could not identify this browser tab.");

  try {
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: "PROBLEM_PRISM_GET_CODE",
    })) as { code?: string };
    if (response.code?.trim()) return { code: response.code };
  } catch {
    // Fall through to a fresh main-page read when the content script is stale.
  }

  if (globalThis.chrome?.scripting) {
    const [injection] = await chrome.scripting.executeScript({
      func: extractCodeFromPage,
      target: { tabId },
      world: "MAIN",
    });
    if (typeof injection?.result === "string" && injection.result.trim()) {
      return { code: injection.result };
    }
  }

  throw new Error(
    "No current code was found. Click inside the LeetCode or NeetCode editor, then try again.",
  );
}

export default function App() {
  const [problem, setProblem] = useState<Problem | null>(
    isDemo ? demoProblem : null,
  );
  const [session, setSession] = useState<TutoringSession | null>(
    isDemo && !isSetupDemo ? demoSession : null,
  );
  const [loadingProblem, setLoadingProblem] = useState(!isDemo);
  const [localError, setLocalError] = useState<string>();
  const [showConsent, setShowConsent] = useState(false);
  const problemIdentityRef = useRef(problemPageIdentity(problem?.url));
  const pendingProblemIdentityRef = useRef<string | undefined>(undefined);
  const generationRequestRef = useRef(0);
  const directAnswerRequestRef = useRef(0);
  const [generationPending, setGenerationPending] = useState(false);
  const [generationError, setGenerationError] = useState<string>();
  const [directAnswer, setDirectAnswer] = useState<DirectAnswer>();
  const [directAnswerPending, setDirectAnswerPending] = useState(false);
  const [directAnswerError, setDirectAnswerError] = useState<string>();
  const chatRequestRef = useRef(0);
  const chatStreamCancelRef = useRef<(() => void) | undefined>(undefined);
  const [chatMessages, setChatMessages] = useState<ProblemChatMessage[]>([]);
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState<string>();

  const auth = useProblemPrismAuth();
  const authenticated = isDemo || auth.isAuthenticated;

  const resetGeneration = () => {
    generationRequestRef.current += 1;
    setGenerationPending(false);
    setGenerationError(undefined);
  };

  const resetDirectAnswer = () => {
    directAnswerRequestRef.current += 1;
    setDirectAnswer(undefined);
    setDirectAnswerPending(false);
    setDirectAnswerError(undefined);
  };

  const resetChat = () => {
    chatRequestRef.current += 1;
    chatStreamCancelRef.current?.();
    chatStreamCancelRef.current = undefined;
    setChatMessages([]);
    setChatPending(false);
    setChatError(undefined);
  };

  useEffect(
    () => () => {
      chatStreamCancelRef.current?.();
    },
    [],
  );

  const loadProblem = async ({ showLoading = true } = {}) => {
    if (isDemo) return;
    if (showLoading) setLoadingProblem(true);
    setLocalError(undefined);
    const next = await readProblem();
    if (!next && !showLoading && problemIdentityRef.current) return;
    const nextIdentity = problemPageIdentity(next?.url);
    if (
      problemIdentityRef.current !== nextIdentity
    ) {
      setSession(null);
      resetGeneration();
      resetDirectAnswer();
      resetChat();
    }
    problemIdentityRef.current = nextIdentity;
    setProblem(next);
    if (showLoading) setLoadingProblem(false);
  };

  useEffect(() => {
    void loadProblem();
    if (!globalThis.chrome?.tabs?.onUpdated) return;
    const handleActivated = () => {
      if (!scopedTabId) void loadProblem();
    };
    const handleUpdated = (
      updatedTabId: number,
      change: chrome.tabs.OnUpdatedInfo,
    ) => {
      if (scopedTabId && updatedTabId !== scopedTabId) return;
      if (change.url) {
        const nextIdentity = problemPageIdentity(change.url);
        if (nextIdentity !== problemIdentityRef.current) {
          pendingProblemIdentityRef.current = nextIdentity;
        }
      }
      if (
        change.status === "complete" &&
        pendingProblemIdentityRef.current !== undefined
      ) {
        pendingProblemIdentityRef.current = undefined;
        void loadProblem({ showLoading: false });
      }
    };
    if (!scopedTabId) chrome.tabs.onActivated.addListener(handleActivated);
    chrome.tabs.onUpdated.addListener(handleUpdated);
    return () => {
      if (!scopedTabId) chrome.tabs.onActivated.removeListener(handleActivated);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (isDemo) return "Demo";
    if (auth.isAuthenticated) return "Connected";
    if (auth.isPending) return "Connecting";
    return "Not connected";
  }, [auth.isAuthenticated, auth.isPending]);

  const error = localError ?? generationError;

  const useSelection = async () => {
    const tabId = await activeTabId();
    if (!tabId || !problem) return;
    try {
      const response = (await chrome.tabs.sendMessage(tabId, {
        type: "PROBLEM_PRISM_GET_SELECTION",
      })) as { selectedText?: string };
      if (!response.selectedText) {
        setLocalError(
          "Highlight part of the problem statement first, then try again.",
        );
        return;
      }
      setProblem({ ...problem, selectedText: response.selectedText });
      setSession(null);
      resetGeneration();
      resetDirectAnswer();
      resetChat();
      setLocalError(undefined);
    } catch {
      setLocalError("ProblemPrism could not read the current page selection.");
    }
  };

  const startCoaching = async () => {
    if (!problem) return;
    const requestId = ++generationRequestRef.current;
    setLocalError(undefined);
    setGenerationError(undefined);
    setGenerationPending(true);
    try {
      const next = isDemo
        ? demoSession
        : await generateTutoringSession(problem, teachingStyle);
      if (requestId !== generationRequestRef.current) return;
      setSession(next);
    } catch (generationFailure) {
      if (requestId !== generationRequestRef.current) return;
      setGenerationError(
        generationFailure instanceof Error
          ? generationFailure.message
          : "Could not build this interview path.",
      );
    } finally {
      if (requestId === generationRequestRef.current) {
        setGenerationPending(false);
      }
    }
  };

  const revealDirectAnswer = async () => {
    if (!problem || directAnswer || directAnswerPending) return;
    const requestId = ++directAnswerRequestRef.current;
    setDirectAnswerError(undefined);
    setDirectAnswerPending(true);
    try {
      const currentCode = isDemo
        ? undefined
        : await readCurrentCode()
            .then((current) => current.code)
            .catch(() => undefined);
      const next = isDemo
        ? {
            ...demoDirectAnswer,
            reminderAt: Date.now() + 24 * 60 * 60 * 1_000,
          }
        : await getDirectAnswer(problem, teachingStyle, currentCode);
      if (requestId === directAnswerRequestRef.current) {
        setDirectAnswer(next);
      }
    } catch (answerFailure) {
      if (requestId !== directAnswerRequestRef.current) return;
      setDirectAnswerError(
        answerFailure instanceof Error
          ? answerFailure.message
          : "ProblemPrism could not generate the complete answer.",
      );
    } finally {
      if (requestId === directAnswerRequestRef.current) {
        setDirectAnswerPending(false);
      }
    }
  };

  const sendChatQuestion = async (question: string) => {
    if (!problem || chatPending) return false;
    const requestId = ++chatRequestRef.current;
    const userMessage: ProblemChatMessage = {
      content: question,
      id: `${Date.now()}-user`,
      role: "user",
    };
    const requestMessages = [...chatMessages.slice(-14), userMessage].map(
      ({ content, role }) => ({ content, role }),
    );
    const assistantMessageId = `${Date.now()}-assistant`;
    const updateAssistant = (content: string, model: string) => {
      if (requestId !== chatRequestRef.current) return;
      setChatMessages((current) => {
        const existing = current.find(
          (message) => message.id === assistantMessageId,
        );
        if (existing) {
          return current.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content, model }
              : message,
          );
        }
        return [
          ...current,
          {
            content,
            id: assistantMessageId,
            model,
            role: "assistant" as const,
          },
        ];
      });
    };
    setChatMessages((current) => [...current, userMessage]);
    setChatError(undefined);
    setChatPending(true);

    try {
      if (isDemo) {
        updateAssistant(
          "### Why check first?\n\nChecking before inserting means the map contains only **earlier indices**. That gives you two guarantees:\n\n- The current element cannot match itself.\n- A repeated value such as `[3, 3]` still works because the first `3` is already stored when you inspect the second.\n\nHow would that ordering behave when the target is `6`?",
          "demo",
        );
      } else {
        const stream = streamProblemQuestion(
          problem,
          teachingStyle,
          requestMessages,
          updateAssistant,
        );
        chatStreamCancelRef.current = stream.cancel;
        const reply = await stream.completion;
        updateAssistant(reply.content, reply.model);
      }
      if (requestId !== chatRequestRef.current) return true;
      return true;
    } catch (chatFailure) {
      if (requestId !== chatRequestRef.current) return true;
      setChatMessages((current) =>
        current.filter(
          (message) =>
            message.id !== userMessage.id && message.id !== assistantMessageId,
        ),
      );
      setChatError(
        chatFailure instanceof Error
          ? chatFailure.message
          : "ChatGPT could not answer that question.",
      );
      return false;
    } finally {
      if (requestId === chatRequestRef.current) setChatPending(false);
      if (requestId === chatRequestRef.current) {
        chatStreamCancelRef.current = undefined;
      }
    }
  };

  useEffect(() => {
    if (authenticated && problem) void startCoaching();
    return () => { generationRequestRef.current += 1; };
  }, [authenticated, problem]);

  if (!authenticated) {
    return (
      <main className="app-shell auth-shell">
        <header className="app-header">
          <div className="brand"><LogoMark /><span>ProblemPrism</span></div>
          <span className="connection-status">{statusLabel}</span>
        </header>
        <AuthGate
          auth={auth}
          onCancelConsent={() => setShowConsent(false)}
          onShowConsent={() => setShowConsent(true)}
          showConsent={showConsent}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><LogoMark /><span>ProblemPrism</span></div>
        <button
          aria-label={isDemo ? "Demo mode" : "Log out of ProblemPrism"}
          className="connection-status connected"
          onClick={() => {
            if (!isDemo) auth.logout();
          }}
          title={isDemo ? "Demo mode" : "Disconnect ChatGPT"}
          type="button"
        >
          <span />
          {statusLabel}
        </button>
      </header>

      {loadingProblem ? (
        <section className="empty-state">
          <span className="loader" />
          <h1>Reading this problem…</h1>
        </section>
      ) : !problem ? (
        <section className="empty-state">
          <EyeIcon />
          <h1>Open a coding problem</h1>
          <p>Visit a LeetCode or NeetCode problem page, then return to ProblemPrism.</p>
          <button className="secondary-button" onClick={() => void loadProblem()} type="button">
            Check again
          </button>
        </section>
      ) : (
        <>
          <ProblemHeader
            compact
            isRefreshing={loadingProblem}
            onRefresh={() => void loadProblem()}
            onUseSelection={() => void useSelection()}
            problem={problem}
          />
          <section className="problem-understanding" aria-label="Understand this problem">
            {session ? (
              <p>{session.stages.find((stage) => stage.id === "understand")?.sections[0]?.body ?? session.overview}</p>
            ) : (
              <p role="status">{generationPending ? "Getting to know this problem…" : "Ask a question to get started."}</p>
            )}
            {error ? (
              <div className="understanding-error" role="alert">
                <p>{error}</p>
                <button className="text-button" onClick={() => void startCoaching()} type="button">Try again</button>
              </div>
            ) : null}
            {session?.visualization ? (
              <details className="inline-example">
                <summary>Walk through an example</summary>
                <VisualizationPanel visualization={session.visualization} />
              </details>
            ) : null}
          </section>
          <ChatPanel
            error={chatError}
            isPending={chatPending}
            messages={chatMessages}
            onClear={resetChat}
            onSend={sendChatQuestion}
            problemTitle={problem.title}
            tools={
              <div className="learning-tools" key={problem.url}>
                <details>
                  <summary>Review my code</summary>
                  <CodeReviewPanel
                    isDemo={isDemo}
                    problem={problem}
                    readCode={readCurrentCode}
                    teachingStyle={teachingStyle}
                  />
                </details>
                {session ? (
                  <>
                    <details>
                      <summary>Hints &amp; solution</summary>
                      <HintsPanel
                        answer={directAnswer}
                        answerError={directAnswerError}
                        hints={session.hints}
                        isAnswerPending={directAnswerPending}
                        onRevealAnswer={() => void revealDirectAnswer()}
                      />
                    </details>
                    <details>
                      <summary>Practice for an interview</summary>
                      <TutorPanel
                        isDemo={isDemo}
                        problem={problem}
                        session={session}
                        teachingStyle={teachingStyle}
                      />
                    </details>
                  </>
                ) : null}
              </div>
            }
          />
        </>
      )}
    </main>
  );
}
