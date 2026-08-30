import type { Problem } from "../types";

export interface ProblemPageAccess {
  injectContentScript: () => Promise<void>;
  requestProblem: () => Promise<Problem | null>;
  wait: (milliseconds: number) => Promise<void>;
}

const RETRY_DELAYS_MS = [150, 350, 700];

export async function readProblemWithRecovery(
  access: ProblemPageAccess,
): Promise<Problem | null> {
  let injected = false;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const problem = await access.requestProblem();
      if (problem) return problem;
    } catch {
      if (injected) return null;

      try {
        await access.injectContentScript();
        injected = true;
        continue;
      } catch {
        return null;
      }
    }

    const delay = RETRY_DELAYS_MS[attempt];
    if (delay !== undefined) await access.wait(delay);
  }

  return null;
}
