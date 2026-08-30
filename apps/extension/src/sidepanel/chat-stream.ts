import type {
  ProblemChatReply,
  ProblemChatStreamEvent,
  ProblemChatStreamRequest,
} from "../types";

interface PortEvent<TListener> {
  addListener: (listener: TListener) => void;
  removeListener: (listener: TListener) => void;
}

export interface ProblemChatPort {
  disconnect: () => void;
  onDisconnect: PortEvent<() => void>;
  onMessage: PortEvent<(message: ProblemChatStreamEvent) => void>;
  postMessage: (message: ProblemChatStreamRequest) => void;
}

export interface ProblemChatStream {
  cancel: () => void;
  completion: Promise<ProblemChatReply>;
}

export function consumeProblemChatPort(
  port: ProblemChatPort,
  request: ProblemChatStreamRequest,
  onDelta: (content: string, model: string) => void,
  disconnectError: () => string | undefined = () => undefined,
): ProblemChatStream {
  let content = "";
  let model = "";
  let settled = false;
  let resolveCompletion: (reply: ProblemChatReply) => void;
  let rejectCompletion: (error: Error) => void;

  const completion = new Promise<ProblemChatReply>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });

  const cleanup = () => {
    port.onMessage.removeListener(handleMessage);
    port.onDisconnect.removeListener(handleDisconnect);
  };

  const fail = (message: string, disconnect = true) => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectCompletion(new Error(message));
    if (disconnect) port.disconnect();
  };

  const finish = () => {
    if (settled) return;
    const completedContent = content.trim();
    if (!completedContent || !model) {
      fail("ChatGPT did not return an answer. Please try again.");
      return;
    }
    settled = true;
    cleanup();
    resolveCompletion({ content: completedContent, model });
    port.disconnect();
  };

  function handleMessage(message: ProblemChatStreamEvent) {
    switch (message.type) {
      case "started":
        model = message.model;
        return;
      case "delta":
        content += message.delta;
        onDelta(content, model);
        return;
      case "done":
        finish();
        return;
      case "error":
        fail(message.error);
    }
  }

  function handleDisconnect() {
    fail(
      disconnectError() ??
        "The ChatGPT stream disconnected before the answer finished.",
      false,
    );
  }

  port.onMessage.addListener(handleMessage);
  port.onDisconnect.addListener(handleDisconnect);

  try {
    port.postMessage(request);
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "ProblemPrism could not start the ChatGPT stream.",
    );
  }

  return {
    cancel: () => {
      if (settled) return;
      fail("The ChatGPT stream was cancelled.");
    },
    completion,
  };
}
