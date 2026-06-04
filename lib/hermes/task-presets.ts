// Node-free registry shared by the client (render) and the API route (validate +
// build the prompt). A task is a one-shot agent run via `hermes -z`, scoped to a
// single toolset with `-t`. Distinct from /chat (conversational, streaming): this
// is fire-and-forget, action-shaped — you ask for an outcome, not a conversation.

export interface TaskPreset {
  id: string;
  label: string;
  toolset: string | null; // `-t` scope for the run; null = all enabled tools
  icon: string; // lucide name, resolved on the client
  paramLabel: string;
  placeholder: string;
  hint: string;
  expectsArtifact: boolean; // produces an image on disk (~/.hermes/images)
  build: (input: string) => string; // prompt template
}

export const TASK_PRESETS: TaskPreset[] = [
  {
    id: "web",
    label: "Web araştırması",
    toolset: "web",
    icon: "Globe",
    paramLabel: "Soru",
    placeholder: "ör. SpaceX'in en son fırlatması ne zaman oldu?",
    hint: "Ajan web'de arar ve özetler",
    expectsArtifact: false,
    build: (q) => q,
  },
  {
    id: "image",
    label: "Görsel üret",
    toolset: "image_gen",
    icon: "Image",
    paramLabel: "Görsel açıklaması",
    placeholder: "ör. yıldızlı gökyüzü altında bir gözlemevi, sinematik",
    hint: "image_gen ile üretir → ~/.hermes/images",
    expectsArtifact: true,
    build: (d) => `Generate an image from this description and save it: ${d}`,
  },
  {
    id: "screenshot",
    label: "Ekran görüntüsü",
    toolset: "browser",
    icon: "Camera",
    paramLabel: "URL",
    placeholder: "ör. https://news.ycombinator.com",
    hint: "Tarayıcıyla açar, ekran görüntüsü alır",
    expectsArtifact: true,
    build: (u) => `Open ${u} in the browser and take a screenshot.`,
  },
  {
    id: "freeform",
    label: "Serbest görev",
    toolset: null,
    icon: "Sparkles",
    paramLabel: "Görev",
    placeholder: "ör. masaüstümdeki notes.txt dosyasını özetle",
    hint: "Tüm araçlar açık — ne istersen",
    expectsArtifact: false,
    build: (p) => p,
  },
];

export function getPreset(id: string): TaskPreset | null {
  return TASK_PRESETS.find((p) => p.id === id) ?? null;
}
