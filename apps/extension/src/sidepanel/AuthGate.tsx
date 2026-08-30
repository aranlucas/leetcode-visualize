import { useState } from "react";
import type { ProblemPrismAuth } from "./auth-types";

interface Props {
  auth: ProblemPrismAuth;
  onCancelConsent: () => void;
  onShowConsent: () => void;
  showConsent: boolean;
}

export function AuthGate({
  auth,
  onCancelConsent,
  onShowConsent,
  showConsent,
}: Props) {
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed">();

  const copyDeviceCode = async () => {
    const code = auth.pending?.userCode;
    if (!code) return;

    try {
      await auth.copyCode();
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  if (auth.status === "pending") {
    return (
      <section className="auth-gate">
        <h1>Finish connecting ChatGPT</h1>
        <p>Enter this one-time code in the OpenAI window. It has also been copied when permitted.</p>
        <button
          aria-label="Copy device code"
          className="device-code"
          onClick={() => void copyDeviceCode()}
          type="button"
        >
          {auth.pending?.userCode}
        </button>
        <span aria-live="polite" className="auth-copy-status" role="status">
          {copyStatus === "copied"
            ? "Copied to clipboard."
            : copyStatus === "failed"
              ? "Copy unavailable. Select and copy the code instead."
              : ""}
        </span>
        <button className="secondary-button" onClick={auth.reopen} type="button">
          Reopen OpenAI
        </button>
      </section>
    );
  }

  if (showConsent) {
    return (
      <section className="auth-gate consent">
        <h1>Authorize ProblemPrism to use ChatGPT?</h1>
        <ul>
          <li>ProblemPrism can request interview coaching, answer critique, and visualizations against your own ChatGPT plan until you disconnect.</li>
          <li>Your problem text, practice answers, and current editor code you explicitly ask to check go directly from this extension to OpenAI. There is no ProblemPrism server.</li>
          <li>Generated coaching is cached locally in Chrome for up to 30 days to avoid repeating the same ChatGPT request. Disconnecting clears that cache.</li>
          <li>If you choose “I just want the answer,” ProblemPrism schedules a local Chrome notification for the next day so you can retry the problem without looking.</li>
          <li>ProblemPrism does not save practice answers or editor code. It never sees your ChatGPT password; login tokens are stored locally in Chrome and restricted to trusted extension contexts.</li>
          <li>You can disconnect at any time from the header.</li>
        </ul>
        <button
          className="primary-button"
          disabled={auth.isConnecting}
          onClick={() => {
            onCancelConsent();
            void auth.login();
          }}
          type="button"
        >
          {auth.isConnecting ? "Connecting…" : "I trust ProblemPrism, continue"}
        </button>
        <button className="text-button" onClick={onCancelConsent} type="button">
          Cancel
        </button>
      </section>
    );
  }

  return (
    <section className="auth-gate">
      <div className="auth-mark">⌁</div>
      <h1>Practice how you think</h1>
      <p>
        Connect ChatGPT for step-by-step interview coaching, feedback on answers
        you choose to write, and useful visual explanations—without an API key.
      </p>
      <button className="primary-button" onClick={onShowConsent} type="button">
        Login with ChatGPT
      </button>
      {auth.error ? <p className="error-text" role="alert">{auth.error}</p> : null}
    </section>
  );
}
