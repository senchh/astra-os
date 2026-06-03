import os from "node:os";
import path from "node:path";

const home = os.homedir();

export const HERMES_DIR = path.join(home, ".hermes");
export const JOBS_FILE = path.join(HERMES_DIR, "cron", "jobs.json");
export const KANBAN_DB = path.join(HERMES_DIR, "kanban.db");
export const STATE_DB = path.join(HERMES_DIR, "state.db");
export const SESSIONS_DIR = path.join(HERMES_DIR, "sessions");
export const MEMORIES_DIR = path.join(HERMES_DIR, "memories");
export const PROFILES_DIR = path.join(HERMES_DIR, "profiles");
export const IMAGES_DIR = path.join(HERMES_DIR, "images");
export const SKILLS_DIR = path.join(HERMES_DIR, "skills");

// Control Room — provider / credential / gateway config.
export const CONFIG_FILE = path.join(HERMES_DIR, "config.yaml");
export const AUTH_FILE = path.join(HERMES_DIR, "auth.json");
export const GATEWAY_STATE_FILE = path.join(HERMES_DIR, "gateway_state.json");
export const PROVIDER_MODELS_CACHE = path.join(HERMES_DIR, "provider_models_cache.json");

// Live agent health — per-API-call latency lines are logged here.
export const LOGS_DIR = path.join(HERMES_DIR, "logs");
export const AGENT_LOG = path.join(LOGS_DIR, "agent.log");

export const VAULT_DIR = path.join(home, "Documents", "HermesMemory");
export const DREAMS_DIR = path.join(VAULT_DIR, "Daily Dream Reports");

// Hermes CLI — used by the chat route to run one-shot agent queries.
export const SOUL_FILE = path.join(HERMES_DIR, "SOUL.md");

export const HERMES_BIN = path.join(home, ".local", "bin", "hermes");
export const LOCAL_BIN = path.join(home, ".local", "bin");
