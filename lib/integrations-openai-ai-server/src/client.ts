import OpenAIDefault from "openai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenAIClient = any;

let _openai: OpenAIClient | null = null;

export function getOpenAI(): OpenAIClient {
  if (_openai) return _openai;

  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_BASE_URL must be set. Did you forget to provision the OpenAI AI integration?",
    );
  }

  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_API_KEY must be set. Did you forget to provision the OpenAI AI integration?",
    );
  }

  _openai = new OpenAIDefault({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  return _openai;
}

// Lazy proxy for backwards compatibility - only throws when actually used
export const openai = new Proxy({} as OpenAIClient, {
  get(_target, prop) {
    return (getOpenAI() as Record<string | symbol, unknown>)[prop];
  },
});