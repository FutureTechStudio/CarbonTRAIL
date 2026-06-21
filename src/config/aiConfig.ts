/** Panda AI configuration — local parser or proxy-backed cloud providers. */
export type AiProvider = "local" | "gemini" | "mistral";

export const AI_CONFIG = {
  mode: (import.meta.env.VITE_AI_MODE as string | undefined) ?? "local",
  geminiModel: (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ?? "gemini-2.0-flash",
  mistralModel: (import.meta.env.VITE_MISTRAL_MODEL as string | undefined) ?? "mistral-small-latest",
  proxyUrl: import.meta.env.VITE_AI_PROXY_URL as string | undefined,
} as const;

export function getAiProvider(): AiProvider {
  if (AI_CONFIG.mode === "mistral") return "mistral";
  if (AI_CONFIG.mode === "gemini") return "gemini";
  return "local";
}

/** Parse endpoint: dev Vite proxy or explicit production proxy URL. */
export function getAiParseUrl(): string | null {
  if (AI_CONFIG.proxyUrl) return AI_CONFIG.proxyUrl;
  if (import.meta.env.DEV && getAiProvider() !== "local") return "/api/panda/parse";
  return null;
}

export function isRemoteAiEnabled(): boolean {
  return getAiProvider() !== "local" && Boolean(getAiParseUrl());
}

/** @deprecated Use getAiProvider() === "gemini" */
export function isGeminiEnabled(): boolean {
  return isRemoteAiEnabled() && getAiProvider() === "gemini";
}

export function isMistralEnabled(): boolean {
  return isRemoteAiEnabled() && getAiProvider() === "mistral";
}

/** @deprecated Use getAiParseUrl() */
export function getGeminiParseUrl(): string | null {
  return getAiParseUrl();
}

export function getAiStatusLabel(): string {
  const provider = getAiProvider();
  if (provider === "local") return "Local parser";
  if (!getAiParseUrl()) {
    return `${provider === "mistral" ? "Mistral" : "Gemini"} (proxy not configured — using local parser)`;
  }
  if (provider === "mistral") return `Mistral · ${AI_CONFIG.mistralModel}`;
  return `Gemini · ${AI_CONFIG.geminiModel}`;
}
