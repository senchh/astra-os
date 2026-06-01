import os from "node:os";
import path from "node:path";

const home = os.homedir();

export const HERMES_DIR = path.join(home, ".hermes");
export const JOBS_FILE = path.join(HERMES_DIR, "cron", "jobs.json");
export const KANBAN_DB = path.join(HERMES_DIR, "kanban.db");
export const SESSIONS_DIR = path.join(HERMES_DIR, "sessions");
export const MEMORIES_DIR = path.join(HERMES_DIR, "memories");
export const PROFILES_DIR = path.join(HERMES_DIR, "profiles");

export const VAULT_DIR = path.join(home, "Documents", "HermesMemory");
export const DREAMS_DIR = path.join(VAULT_DIR, "Daily Dream Reports");
