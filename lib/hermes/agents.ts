import { readControlRoom } from "./control";
import type { AgentOption } from "./types";

/**
 * Per-agent chat: turn the authed providers from the Control Room into selectable
 * "agents" for /chat. Picking one routes a single conversation through that
 * provider+model (CLI `--provider`/`-m`) — transient, never touching the sticky
 * config default. Only providers in the credential pool are offered (same gate as
 * the Control Room model picker: cached-but-unauthed providers like anthropic/
 * openrouter need a login first, so we don't surface them).
 */

// Friendly display names for known provider ids; unknowns fall back to a tidy
// title-case of the id.
const LABELS: Record<string, string> = {
  "xai-oauth": "Grok",
  xai: "Grok",
  gemini: "Gemini",
  copilot: "Copilot",
  "openai-codex": "Codex",
  "openai-api": "OpenAI",
  openai: "OpenAI",
  anthropic: "Claude",
  openrouter: "OpenRouter",
};

function labelFor(id: string): string {
  if (LABELS[id]) return LABELS[id];
  return id
    .split(/[-_]/)
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

export function readAgents(): AgentOption[] {
  const cr = readControlRoom();
  return cr.providers
    // Only providers that actually expose models can answer a chat.
    .filter((p) => p.models.length > 0)
    .map((p) => ({
      provider: p.id,
      label: labelFor(p.id),
      status: p.status,
      models: p.models,
      // The default provider's pill mirrors the sticky default model; others
      // preselect their first cached model (the user can change it).
      defaultModel: p.isDefault ? cr.defaultModel : p.models[0],
      isDefault: p.isDefault,
    }))
    // Default agent first, then the order Control Room already sorted by health.
    .sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1));
}

/**
 * Server-side guard for a requested override: the provider must be authed and the
 * model must belong to that provider's cached list. Returns the safe pair, or null
 * to fall back to the sticky default. Mirrors the model-picker route's validation.
 */
export function resolveAgent(
  provider: unknown,
  model: unknown
): { provider: string; model: string } | null {
  if (typeof provider !== "string" || typeof model !== "string") return null;
  const agent = readAgents().find((a) => a.provider === provider);
  if (!agent) return null;
  if (!agent.models.includes(model)) return null;
  return { provider, model };
}
