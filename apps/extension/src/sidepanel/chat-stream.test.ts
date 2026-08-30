import { describe, expect, it, vi } from "vitest";
import { demoProblem } from "./demo";
import {
  consumeProblemChatPort,
  type ProblemChatPort,
} from "./chat-stream";
import type {
  ProblemChatStreamEvent,
  ProblemChatStreamRequest,
} from "../types";

class FakePortEvent<TListener extends (...args: never[]) => void> {
  private listeners = new Set<TListener>();

  addListener = (listener: TListener) => {
    this.listeners.add(listener);
  };

  removeListener = (listener: TListener) => {
    this.listeners.delete(listener);
  };

  emit(...args: Parameters<TListener>) {
    for (const listener of this.listeners) listener(...args);
  }
}

class FakeProblemChatPort implements ProblemChatPort {
  disconnected = false;
  posted: ProblemChatStreamRequest[] = [];
  onDisconnect = new FakePortEvent<() => void>();
  onMessage = new FakePortEvent<(message: ProblemChatStreamEvent) => void>();

  disconnect = () => {
    this.disconnected = true;
    this.onDisconnect.emit();
  };

  postMessage = (message: ProblemChatStreamRequest) => {
    this.posted.push(message);
  };
}

const request: ProblemChatStreamRequest = {
  messages: [{ role: "user", content: "What should I track?" }],
  problem: demoProblem,
  teachingStyle: "guided",
  type: "start",
};

describe("problem chat stream client", () => {
  it("accumulates deltas and resolves the completed answer", async () => {
    const port = new FakeProblemChatPort();
    const updates: string[] = [];
    const stream = consumeProblemChatPort(port, request, (content) => {
      updates.push(content);
    });

    port.onMessage.emit({ type: "started", model: "gpt-test" });
    port.onMessage.emit({ type: "delta", delta: "Track the " });
    port.onMessage.emit({ type: "delta", delta: "complement." });
    port.onMessage.emit({ type: "done" });

    await expect(stream.completion).resolves.toEqual({
      content: "Track the complement.",
      model: "gpt-test",
    });
    expect(updates).toEqual(["Track the ", "Track the complement."]);
    expect(port.posted).toEqual([request]);
    expect(port.disconnected).toBe(true);
  });

  it("surfaces an error event without returning a partial answer", async () => {
    const port = new FakeProblemChatPort();
    const stream = consumeProblemChatPort(port, request, vi.fn());
    const rejection = expect(stream.completion).rejects.toThrow(
      "The model stream failed.",
    );

    port.onMessage.emit({ type: "started", model: "gpt-test" });
    port.onMessage.emit({ type: "delta", delta: "Partial" });
    port.onMessage.emit({ type: "error", error: "The model stream failed." });

    await rejection;
    expect(port.disconnected).toBe(true);
  });

  it("disconnects the runtime port when cancelled", async () => {
    const port = new FakeProblemChatPort();
    const stream = consumeProblemChatPort(port, request, vi.fn());
    const rejection = expect(stream.completion).rejects.toThrow(
      "The ChatGPT stream was cancelled.",
    );

    stream.cancel();

    await rejection;
    expect(port.disconnected).toBe(true);
  });

  it("reports a runtime disconnect before completion", async () => {
    const port = new FakeProblemChatPort();
    const stream = consumeProblemChatPort(
      port,
      request,
      vi.fn(),
      () => "The extension was reloaded.",
    );
    const rejection = expect(stream.completion).rejects.toThrow(
      "The extension was reloaded.",
    );

    port.onDisconnect.emit();

    await rejection;
  });
});
