/** Panda AI configuration — local parser, Gemini, or Mistral. */
export type AiProvider = "local" | "gemini" | "mistral";

export const AI_CONFIG = {
  mode: (import.meta.env.VITE_AI_MODE as string | undefined) ?? "local",
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY as string | undefined,
  geminiModel: (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ?? "gemini-2.0-flash",
  mistralApiKey: import.meta.env.VITE_MISTRAL_API_KEY as string | undefined,
  mistralModel: (import.meta.env.VITE_MISTRAL_MODEL as string | undefined) ?? "mistral-small-latest",
  proxyUrl: import.meta.env.VITE_AI_PROXY_URL as string | undefined,
} as const;

export function getAiProvider(): AiProvider {
  if (AI_CONFIG.mode === "local") return "local";
  if (AI_CONFIG.mode === "mistral" && (AI_CONFIG.mistralApiKey || AI_CONFIG.proxyUrl)) {
    return "mistral";
  }
  if (AI_CONFIG.mode === "gemini" && (AI_CONFIG.geminiApiKey || AI_CONFIG.proxyUrl)) {
    return "gemini";
  }
  return "local";
}

export function isRemoteAiEnabled(): boolean {
  return getAiProvider() !== "local";
}

/** @deprecated Use getAiProvider() === "gemini" */
export function isGeminiEnabled(): boolean {
  return getAiProvider() === "gemini";
}

export function isMistralEnabled(): boolean {
  return getAiProvider() === "mistral";
}

/** Parse endpoint: dev proxy (no CORS) or explicit production proxy URL. */
export function getAiParseUrl(): string | null {
  if (AI_CONFIG.proxyUrl) return AI_CONFIG.proxyUrl;
  if (import.meta.env.DEV && isRemoteAiEnabled()) return "/api/panda/parse";
  return null;
}

/** @deprecated Use getAiParseUrl() */
export function getGeminiParseUrl(): string | null {
  return getAiParseUrl();
}

export function getAiStatusLabel(): string {
  const provider = getAiProvider();
  if (provider === "local") return "Local parser";
  if (provider === "mistral") {
    if (getAiParseUrl()) return `Mistral · ${AI_CONFIG.mistralModel}`;
    return "Mistral (direct — may be blocked by browser)";
  }
  if (getAiParseUrl()) return `Gemini · ${AI_CONFIG.geminiModel}`;
  return "Gemini (direct — may be blocked by browser)";
}
