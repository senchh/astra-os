/**
 * SSE parsing for Hermes' OpenAI-compatible chat stream.
 *
 * Adapted from fathah/hermes-desktop `src/main/sse-parser.ts` (MIT) —
 * the streaming contract is identical (`/v1/chat/completions`, `data:` chunks,
 * `[DONE]`, `hermes.tool.progress` custom events, usage on the final chunk).
 */

export interface ParsedUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

export interface SseCallbacks {
  onChunk: (text: string) => void;
  onToolProgress?: (tool: string) => void;
  onUsage?: (usage: ParsedUsage) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

/** Tool progress pattern: `emoji tool_name` or `emoji description`. */
const toolProgressRe = /^`([^\s`]+)\s+([^`]+)`$/;

/** Handle a custom SSE event (e.g. hermes.tool.progress). Returns true if handled. */
export function processCustomEvent(
  eventType: string,
  data: string,
  cb: Pick<SseCallbacks, "onToolProgress">
): boolean {
  if (eventType === "hermes.tool.progress" && cb.onToolProgress) {
    try {
      const payload = JSON.parse(data);
      const label = payload.label || payload.tool || "";
      const emoji = payload.emoji || "";
      cb.onToolProgress(emoji ? `${emoji} ${label}` : label);
      return true;
    } catch {
      /* malformed — skip */
    }
  }
  return false;
}

interface PumpState {
  hasContent: boolean;
  lastError: string;
}

/** Process one SSE data payload (after the `data: ` prefix is stripped). */
function processSseData(data: string, cb: SseCallbacks, state: PumpState): boolean {
  if (data === "[DONE]") return true;

  try {
    const parsed = JSON.parse(data);

    if (parsed.error) {
      state.lastError = parsed.error.message || JSON.stringify(parsed.error);
      return false;
    }

    if (parsed.usage && cb.onUsage) {
      cb.onUsage({
        promptTokens: parsed.usage.prompt_tokens || 0,
        completionTokens: parsed.usage.completion_tokens || 0,
        totalTokens: parsed.usage.total_tokens || 0,
        cost: parsed.usage.cost,
        rateLimitRemaining: parsed.usage.rate_limit_remaining,
        rateLimitReset: parsed.usage.rate_limit_reset,
      });
    }

    const delta = parsed.choices?.[0]?.delta;
    if (delta?.content) {
      const content = String(delta.content).trim();
      const match = toolProgressRe.exec(content);
      if (match && cb.onToolProgress) {
        cb.onToolProgress(`${match[1]} ${match[2]}`);
      } else {
        state.hasContent = true;
        cb.onChunk(delta.content);
      }
    }
  } catch {
    /* malformed chunk — skip */
  }
  return false;
}

/** Split a raw SSE block into its `event:` and `data:` lines. */
function parseSseBlock(block: string): { eventType: string; data: string } | null {
  let eventType = "";
  let dataLine = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) eventType = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLine = line.slice(5).replace(/^\s/, "");
  }
  if (!dataLine) return null;
  return { eventType, data: dataLine };
}

/**
 * Stateful pump: feed it decoded text chunks as they arrive off the wire;
 * it buffers, splits on blank lines, and drives the callbacks.
 */
export function makeSsePump(cb: SseCallbacks) {
  let buffer = "";
  const state: PumpState = { hasContent: false, lastError: "" };
  let done = false;

  const handleBlock = (block: string) => {
    if (!block.trim()) return;
    const parsed = parseSseBlock(block);
    if (!parsed) return;
    if (parsed.eventType && processCustomEvent(parsed.eventType, parsed.data, cb)) return;
    if (processSseData(parsed.data, cb, state)) done = true;
  };

  return {
    push(text: string) {
      buffer += text;
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const b of blocks) handleBlock(b);
    },
    end() {
      if (buffer.trim()) handleBlock(buffer);
      buffer = "";
      if (state.lastError) cb.onError?.(state.lastError);
      else if (done || state.hasContent) cb.onDone?.();
    },
  };
}
