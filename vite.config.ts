import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { pandaGeminiProxyPlugin } from "./vite.pandaGeminiProxy";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const aiMode = env.VITE_AI_MODE ?? "local";
  const geminiKey = env.GEMINI_API_KEY;
  const mistralKey = env.MISTRAL_API_KEY;
  const geminiModel = env.GEMINI_MODEL || env.VITE_GEMINI_MODEL || "gemini-2.0-flash";
  const mistralModel = env.MISTRAL_MODEL || env.VITE_MISTRAL_MODEL || "mistral-small-latest";
  const useAiProxy =
    aiMode !== "local" &&
    ((aiMode === "gemini" && Boolean(geminiKey)) || (aiMode === "mistral" && Boolean(mistralKey)));

  const proxyProvider = aiMode === "mistral" ? "mistral" : "gemini";

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(useAiProxy
        ? [
            pandaGeminiProxyPlugin({
              provider: proxyProvider,
              apiKey: proxyProvider === "mistral" ? mistralKey : geminiKey,
              model: proxyProvider === "mistral" ? mistralModel : geminiModel,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
