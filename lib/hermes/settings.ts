import fs from "node:fs";
import yaml from "js-yaml";
import { CONFIG_FILE } from "./paths";
import { SETTING_FIELDS, type SettingValue } from "./settings-fields";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Settings = {
  // Current value for each registry key (dotted key → value).
  values: Record<string, SettingValue | null>;
  // Read-only context: which model these settings apply to (model is Control Room's domain).
  model: { default: string; provider: string } | null;
};

function getPath(obj: any, dotted: string): unknown {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function readSettings(): Settings {
  let cfg: any = null;
  try {
    cfg = yaml.load(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    cfg = null;
  }

  const values: Record<string, SettingValue | null> = {};
  for (const f of SETTING_FIELDS) {
    const v = cfg ? getPath(cfg, f.key) : undefined;
    values[f.key] =
      typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : null;
  }

  const m = cfg?.model;
  const model =
    m && typeof m === "object"
      ? { default: String(m.default ?? ""), provider: String(m.provider ?? "") }
      : null;

  return { values, model };
}
