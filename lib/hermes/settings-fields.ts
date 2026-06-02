// Curated, SAFE-to-edit Hermes config fields surfaced on /settings.
// IMPORTANT: `hermes config set` does NOT validate values (it accepts garbage
// and writes it verbatim), so the UI is the only guardrail — we expose ONLY
// fields whose valid value domain we know for certain (bools, a fixed enum,
// or a bounded number). Unknown-domain keys (image_input_mode,
// tool_use_enforcement, service_tier…) are deliberately omitted until their
// option sets are confirmed. This registry has no node imports so it can be
// shared by both the client panel and the API allowlist.

export type FieldKind = "bool" | "enum" | "number";

export type SettingField = {
  key: string; // dotted config key passed to `hermes config set`
  label: string;
  kind: FieldKind;
  group: "Davranış" | "Görünüm";
  hint: string;
  options?: string[]; // enum
  min?: number; // number
  max?: number;
};

// 14 built-in Hermes personalities (exact keys from config.personalities).
const PERSONALITIES = [
  "helpful", "concise", "technical", "creative", "teacher", "kawaii",
  "catgirl", "pirate", "shakespeare", "surfer", "noir", "uwu",
  "philosopher", "hype",
];

export const SETTING_FIELDS: SettingField[] = [
  // — Davranış (agent.*) —
  {
    key: "agent.reasoning_effort",
    label: "Reasoning effort",
    kind: "enum",
    group: "Davranış",
    options: ["minimal", "low", "medium", "high"],
    hint: "Akıl yürütme derinliği — yüksek = daha iyi karar, daha çok token & gecikme.",
  },
  {
    key: "agent.max_turns",
    label: "Max turns",
    kind: "number",
    group: "Davranış",
    min: 1,
    max: 500,
    hint: "Tek görevde izin verilen azami araç-döngüsü adımı.",
  },
  {
    key: "agent.verbose",
    label: "Verbose",
    kind: "bool",
    group: "Davranış",
    hint: "Ayrıntılı iç günlük çıktısı.",
  },
  {
    key: "agent.task_completion_guidance",
    label: "Görev tamamlama yönlendirmesi",
    kind: "bool",
    group: "Davranış",
    hint: "Ajanı görevi bitirmeye doğru iten ek yönlendirme.",
  },
  {
    key: "agent.environment_probe",
    label: "Ortam taraması",
    kind: "bool",
    group: "Davranış",
    hint: "Başlangıçta çalışma ortamını otomatik keşfeder.",
  },
  // — Görünüm (display.*) —
  {
    key: "display.personality",
    label: "Persona",
    kind: "enum",
    group: "Görünüm",
    options: PERSONALITIES,
    hint: "Yanıt tonu (SOUL.md'den ayrı, yerleşik kişilik kalıbı).",
  },
  {
    key: "display.streaming",
    label: "Streaming",
    kind: "bool",
    group: "Görünüm",
    hint: "Yanıtı token-token akıt.",
  },
  {
    key: "display.show_reasoning",
    label: "Reasoning göster",
    kind: "bool",
    group: "Görünüm",
    hint: "Akıl yürütme adımlarını görünür kıl.",
  },
  {
    key: "display.show_cost",
    label: "Maliyet göster",
    kind: "bool",
    group: "Görünüm",
    hint: "Her yanıttan sonra token/maliyet özetini göster.",
  },
];

export const ALLOWED_KEYS = new Set(SETTING_FIELDS.map((f) => f.key));

export type SettingValue = string | number | boolean;
