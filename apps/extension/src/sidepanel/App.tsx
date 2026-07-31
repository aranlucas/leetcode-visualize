import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CurrentCode,
  DirectAnswer,
  Problem,
  TeachingStyle,
  TutoringSession,
} from "../types";
import {
  problemPageIdentity,
  scopedTabIdFromSearch,
} from "../tab-scope";
import { AuthGate } from "./AuthGate";
import { CodeReviewPanel } from "./CodeReviewPanel";
import { generateTutoringSession, getDirectAnswer } from "./bridge";
import {
  demoDirectAnswer,
  demoProblem,
  demoSession,
} from "./demo";
import { CodeIcon, EyeIcon, LogoMark, PlayIcon } from "./icons";
import { HintsPanel } from "./HintsPanel";
import { STAGE_LABELS, STAGE_ORDER } from "./InterviewPath";
import { ProblemHeader } from "./ProblemHeader";
import {
  TEACHING_STYLES,
  TeachingStylePicker,
} from "./TeachingStylePicker";
import { TutorPanel } from "./TutorPanel";
import { useProblemPrismAuth } from "./useProblemPrismAuth";
import { VisualizationPanel } from "./VisualizationPanel";

type Tab = "approach" | "visualize" | "hints" | "code";

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
  try {
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: "PROBLEM_PRISM_GET_PROBLEM",
    })) as { problem?: Problem | null };
    return response.problem ?? null;
  } catch {
    return null;
  }
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
  const [teachingStyle, setTeachingStyle] =
    useState<TeachingStyle>("guided");
  const [tab, setTab] = useState<Tab>("approach");
  const [loadingProblem, setLoadingProblem] = useState(!isDemo);
  const [localError, setLocalError] = useState<string>();
  const [showConsent, setShowConsent] = useState(false);
  const [showInitialCodeReview, setShowInitialCodeReview] = useState(false);
  const problemIdentityRef = useRef(problemPageIdentity(problem?.url));
  const pendingProblemIdentityRef = useRef<string | undefined>(undefined);
  const generationRequestRef = useRef(0);
  const directAnswerRequestRef = useRef(0);
  const [generationPending, setGenerationPending] = useState(false);
  const [generationError, setGenerationError] = useState<string>();
  const [directAnswer, setDirectAnswer] = useState<DirectAnswer>();
  const [directAnswerPending, setDirectAnswerPending] = useState(false);
  const [directAnswerError, setDirectAnswerError] = useState<string>();

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

  const loadProblem = async ({ showLoading = true } = {}) => {
    if (isDemo) return;
    if (showLoading) setLoadingProblem(true);
    setLocalError(undefined);
    const next = await readProblem();
    if (!next && !showLoading && problemIdentityRef.current) return;
    const nextIdentity = problemPageIdentity(next?.url);
    if (
      problemIdentityRef.current &&
      nextIdentity &&
      problemIdentityRef.current !== nextIdentity
    ) {
      setSession(null);
      resetGeneration();
      resetDirectAnswer();
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

  const activeStyle =
    TEACHING_STYLES.find((style) => style.id === teachingStyle) ??
    TEACHING_STYLES[0];
  const error = localError ?? generationError;

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
      setTab("approach");
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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><LogoMark /><span>ProblemPrism</span></div>
        <button
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
            compact={Boolean(session)}
            isRefreshing={loadingProblem}
            onRefresh={() => void loadProblem()}
            onUseSelection={() => void useSelection()}
            problem={problem}
          />

          {!session ? (
            <>
              <TeachingStylePicker
                onChange={(style) => {
                  setTeachingStyle(style);
                  resetGeneration();
                  resetDirectAnswer();
                }}
                value={teachingStyle}
              />
              <section className="generate-section coaching-start">
                <div className="coaching-start-actions">
                  <button
                    className="primary-button visualize-button"
                    disabled={generationPending}
                    onClick={() => void startCoaching()}
                    type="button"
                  >
                    {generationPending ? <span className="loader light" /> : <PlayIcon />}
                    {generationPending
                      ? "Building your interview path…"
                      : "Start interview coaching"}
                  </button>
                  <button
                    className="secondary-button current-code-button"
                    onClick={() =>
                      setShowInitialCodeReview((current) => !current)
                    }
                    type="button"
                  >
                    <CodeIcon />
                    {showInitialCodeReview
                      ? "Hide code check"
                      : "Check my current code"}
                  </button>
                </div>
                <p>Build the reasoning before the code.</p>
              </section>

              {showInitialCodeReview ? (
                <CodeReviewPanel
                  isDemo={isDemo}
                  key={`${problem.url}:${teachingStyle}:setup`}
                  problem={problem}
                  readCode={readCurrentCode}
                  teachingStyle={teachingStyle}
                />
              ) : null}

              {error ? (
                <div className="error-banner" role="alert">{error}</div>
              ) : null}

              <section className="path-preview">
                <h2>Your interview path</h2>
                <ol>
                  {STAGE_ORDER.map((stageId, index) => (
                    <li className={index === 0 ? "active" : ""} key={stageId}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{STAGE_LABELS[stageId]}</strong>
                        <p>
                          {[
                            "Clarify the problem and constraints",
                            "Identify key information and patterns",
                            "Test ideas and compare tradeoffs",
                            "Choose an approach and plan steps",
                            "Walk through your reasoning aloud",
                          ][index]}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : (
            <>
              <section className="active-style-bar">
                <div>
                  <span className="style-radio" aria-hidden="true"><span /></span>
                  <strong>{activeStyle.label}</strong>
                  <span>{activeStyle.description}</span>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setSession(null);
                    resetGeneration();
                    resetDirectAnswer();
                  }}
                  type="button"
                >
                  Change style
                </button>
              </section>

              {error ? (
                <div className="error-banner" role="alert">{error}</div>
              ) : null}

              <nav className="tabs coaching-tabs" aria-label="Learning modes">
                <button
                  aria-selected={tab === "approach"}
                  className={tab === "approach" ? "active" : ""}
                  onClick={() => setTab("approach")}
                  role="tab"
                  type="button"
                >
                  Approach
                </button>
                <button
                  aria-selected={tab === "visualize"}
                  className={tab === "visualize" ? "active" : ""}
                  onClick={() => setTab("visualize")}
                  role="tab"
                  type="button"
                >
                  Visualize
                </button>
                <button
                  aria-selected={tab === "hints"}
                  className={tab === "hints" ? "active" : ""}
                  onClick={() => setTab("hints")}
                  role="tab"
                  type="button"
                >
                  Hints
                </button>
                <button
                  aria-selected={tab === "code"}
                  className={tab === "code" ? "active" : ""}
                  onClick={() => setTab("code")}
                  role="tab"
                  type="button"
                >
                  Check code
                </button>
              </nav>

              {tab === "approach" ? (
                <TutorPanel
                  isDemo={isDemo}
                  problem={problem}
                  session={session}
                  teachingStyle={teachingStyle}
                />
              ) : tab === "visualize" ? (
                session.visualization ? (
                  <VisualizationPanel visualization={session.visualization} />
                ) : (
                  <section className="no-visualization">
                    <EyeIcon />
                    <h2>A diagram isn’t the best teacher here</h2>
                    <p>{session.visualizationReason}</p>
                    <button
                      className="secondary-button"
                      onClick={() => setTab("approach")}
                      type="button"
                    >
                      Return to the interview path
                    </button>
                  </section>
                )
              ) : tab === "hints" ? (
                <HintsPanel
                  answer={directAnswer}
                  answerError={directAnswerError}
                  hints={session.hints}
                  isAnswerPending={directAnswerPending}
                  onRevealAnswer={() => void revealDirectAnswer()}
                />
              ) : (
                <CodeReviewPanel
                  isDemo={isDemo}
                  key={`${problem.url}:${teachingStyle}:session`}
                  problem={problem}
                  readCode={readCurrentCode}
                  teachingStyle={teachingStyle}
                />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
