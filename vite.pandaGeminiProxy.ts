import type { Connect } from "vite";
import type { Plugin } from "vite";

type AiProxyProvider = "gemini" | "mistral";

type AiProxyOptions = {
  provider: AiProxyProvider;
  apiKey: string | undefined;
  model: string;
};

async function callGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    },
  );

  const payload = (await response.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error:
        payload?.error?.message ??
        `Gemini API error (${response.status}). Check your API key is from Google AI Studio (starts with AIza).`,
    };
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { ok: false as const, status: 502, error: "Gemini returned an empty response." };
  }

  return { ok: true as const, text };
}

async function callMistral(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error: payload?.error?.message ?? `Mistral API error (${response.status}). Check VITE_MISTRAL_API_KEY.`,
    };
  }

  const text = payload?.choices?.[0]?.message?.content;
  if (!text) {
    return { ok: false as const, status: 502, error: "Mistral returned an empty response." };
  }

  return { ok: true as const, text };
}

function missingKeyMessage(provider: AiProxyProvider): string {
  if (provider === "mistral") {
    return "VITE_MISTRAL_API_KEY is not set. Add it to .env.local and restart the dev server.";
  }
  return "VITE_GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.";
}

function attachAiProxy(middlewares: Connect.Server, options: AiProxyOptions) {
  const { provider, apiKey, model } = options;

  middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith("/api/panda/parse")) {
      next();
      return;
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    if (!apiKey) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: missingKeyMessage(provider) }));
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          systemPrompt?: string;
          userPrompt?: string;
        };

        const systemPrompt = body.systemPrompt ?? "";
        const userPrompt = body.userPrompt ?? "";
        const result =
          provider === "mistral"
            ? await callMistral(apiKey, model, systemPrompt, userPrompt)
            : await callGemini(apiKey, model, systemPrompt, userPrompt);

        if (!result.ok) {
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: result.error }));
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(result.text);
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Proxy error" }));
      }
    });
  });
}

/** Dev/preview proxy so API keys stay off the client and avoid browser CORS. */
export function pandaGeminiProxyPlugin(options: AiProxyOptions): Plugin {
  return {
    name: "panda-ai-proxy",
    configureServer(server) {
      attachAiProxy(server.middlewares, options);
    },
    configurePreviewServer(server) {
      attachAiProxy(server.middlewares, options);
    },
  };
}
