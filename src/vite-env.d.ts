/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_MODE?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_MISTRAL_API_KEY?: string;
  readonly VITE_MISTRAL_MODEL?: string;
  readonly VITE_AI_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
