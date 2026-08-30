import { useEffect, useRef, useState } from "react";
import type { AuthState } from "../types";
import { authStatus, beginAuth, logoutAuth, pollAuth } from "./bridge";

const INITIAL_STATE: AuthState = { status: "loading" };

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useProblemPrismAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const [busy, setBusy] = useState(false);
  const [asyncError, setAsyncError] = useState<unknown>();
  const pollInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    void authStatus()
      .then((next) => {
        if (active) setState(next);
      })
      .catch((statusError) => {
        if (active) setAsyncError(statusError);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (state.status !== "pending") return;
    let active = true;
    const poll = async () => {
      if (pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        const next = await pollAuth();
        if (active) {
          setState(next);
          setAsyncError(undefined);
        }
      } catch (pollError) {
        if (active) setAsyncError(pollError);
      } finally {
        pollInFlight.current = false;
      }
    };
    const timer = window.setInterval(
      () => void poll(),
      Math.max((state.pending?.interval ?? 3) * 1_000, 2_500),
    );
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [state.pending?.interval, state.status]);

  const error =
    state.error ??
    (asyncError
      ? errorMessage(asyncError, "Could not connect to ChatGPT.")
      : undefined);

  const login = async () => {
    setBusy(true);
    setAsyncError(undefined);
    try {
      const next = await beginAuth();
      setState(next);
      if (next.pending?.userCode && navigator.clipboard) {
        void navigator.clipboard
          .writeText(next.pending.userCode)
          .catch(() => undefined);
      }
    } catch (loginError) {
      setAsyncError(loginError);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setAsyncError(undefined);
    try {
      setState(await logoutAuth());
    } catch (logoutError) {
      setAsyncError(logoutError);
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!state.pending?.userCode || !navigator.clipboard) {
      throw new Error("Clipboard access is unavailable.");
    }
    await navigator.clipboard.writeText(state.pending.userCode);
  };

  const reopen = () => {
    if (state.pending?.verificationUrl) {
      void chrome.tabs.create({ url: state.pending.verificationUrl });
    }
  };

  return {
    ...state,
    copyCode,
    error,
    isAuthenticated: state.status === "authenticated",
    isConnecting: busy || state.status === "pending",
    isPending: state.status === "pending",
    login,
    logout,
    reopen,
  };
}
