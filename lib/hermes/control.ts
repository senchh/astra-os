import fs from "node:fs";
import yaml from "js-yaml";
import {
  AUTH_FILE,
  CONFIG_FILE,
  GATEWAY_STATE_FILE,
  PROVIDER_MODELS_CACHE,
} from "./paths";
import type {
  ControlRoom,
  CredStatus,
  Credential,
  GatewayInfo,
  ProviderInfo,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function readJson(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readYaml(file: string): any {
  try {
    return yaml.load(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function credStatus(raw: any): CredStatus {
  const s = raw?.last_status;
  if (s === "ok") return "ok";
  if (s === "exhausted") return "exhausted";
  if (raw?.last_error_code) return "error";
  return "unknown";
}

// Whitelist: only non-secret fields ever leave this module.
// access_token / refresh_token / id_token are intentionally never read.
function toCredential(raw: any): Credential {
  return {
    id: String(raw?.id ?? ""),
    label: raw?.label ?? "(etiketsiz)",
    authType: raw?.auth_type ?? "—",
    source: raw?.source ?? "—",
    priority: Number(raw?.priority ?? 0),
    status: credStatus(raw),
    errorCode: raw?.last_error_code ?? null,
    errorReason: raw?.last_error_reason ?? null,
    errorMessage: raw?.last_error_message ?? null,
    errorResetAt: raw?.last_error_reset_at ?? null,
    baseUrl: raw?.base_url ?? "",
    fingerprint: raw?.secret_fingerprint ?? null,
    requestCount: Number(raw?.request_count ?? 0),
  };
}

const STATUS_RANK: Record<CredStatus, number> = {
  ok: 0,
  unknown: 1,
  error: 2,
  exhausted: 3,
};

// Provider rolls up to its best credential — one working key means usable.
function rollUp(creds: Credential[]): CredStatus {
  if (creds.length === 0) return "unknown";
  return creds.reduce<CredStatus>(
    (best, c) => (STATUS_RANK[c.status] < STATUS_RANK[best] ? c.status : best),
    "exhausted"
  );
}

function readGateway(): GatewayInfo {
  const g = readJson(GATEWAY_STATE_FILE);
  if (!g) return { state: "unknown", pid: null, updatedAt: null, platforms: [] };
  const platforms = Object.entries(g.platforms ?? {}).map(
    ([name, v]: [string, any]) => ({
      name,
      state: v?.state ?? "unknown",
      error: v?.error_message ?? null,
    })
  );
  return {
    state: g.gateway_state ?? "unknown",
    pid: typeof g.pid === "number" ? g.pid : null,
    updatedAt: g.updated_at ?? null,
    platforms,
  };
}

export function readControlRoom(): ControlRoom {
  const auth = readJson(AUTH_FILE) ?? {};
  const config = readYaml(CONFIG_FILE) ?? {};
  const modelsCache = readJson(PROVIDER_MODELS_CACHE) ?? {};

  const activeProvider: string | null = auth.active_provider ?? null;
  const defaultProvider: string = config?.model?.provider ?? "";
  const defaultModel: string = config?.model?.default ?? "—";

  const pool: Record<string, any[]> = auth.credential_pool ?? {};
  const providers: ProviderInfo[] = Object.entries(pool)
    .map(([id, creds]): ProviderInfo => {
      const credentials = (creds ?? [])
        .map(toCredential)
        .sort((a, b) => a.priority - b.priority);
      return {
        id,
        credentials,
        status: rollUp(credentials),
        modelCount: Array.isArray(modelsCache?.[id]?.models)
          ? modelsCache[id].models.length
          : 0,
        isActive: id === activeProvider,
        isDefault: id === defaultProvider,
      };
    })
    // Active first, then default, then by health, then name.
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      const d = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      return d !== 0 ? d : a.id.localeCompare(b.id);
    });

  const tts = config?.tts?.provider ?? null;
  const stt = config?.stt?.provider ?? null;
  const sttEnabled = Boolean(config?.stt?.enabled);

  return {
    providers,
    activeProvider,
    defaultModel,
    defaultProvider,
    gateway: readGateway(),
    voice: { tts, stt, sttEnabled },
    updatedAt: auth.updated_at ?? null,
  };
}
