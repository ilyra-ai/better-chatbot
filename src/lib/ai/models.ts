import "server-only";

import { createOllama } from "ollama-ai-provider-v2";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { LanguageModel } from "ai";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";

const ollamaClient = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
});
const groqClient = createGroq({
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

type ProviderFactory = (model: string) => LanguageModel;

type RegisterOptions = {
  displayName?: string;
  apiName?: string;
  isToolCallUnsupported?: boolean;
  isImageInputUnsupported?: boolean;
  model?: LanguageModel;
};

const providerFactories: Record<string, ProviderFactory> = {
  openai: (model) => openai(model),
  google: (model) => google(model),
  anthropic: (model) => anthropic(model),
  xai: (model) => xai(model),
  ollama: (model) => ollamaClient(model),
  groq: (model) => groqClient(model),
  openRouter: (model) => openrouter(model),
};

const providerKeyCheckers: Record<string, () => boolean> = {
  openai: () => hasValidKey(process.env.OPENAI_API_KEY),
  google: () => hasValidKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
  anthropic: () => hasValidKey(process.env.ANTHROPIC_API_KEY),
  xai: () => hasValidKey(process.env.XAI_API_KEY),
  groq: () => hasValidKey(process.env.GROQ_API_KEY),
  openRouter: () => hasValidKey(process.env.OPENROUTER_API_KEY),
  ollama: () => true,
};

const providerHasExplicitKey = new Map<string, boolean>();

const imageInputSupportedProviders = new Set([
  "google",
  "xai",
  "openai",
  "anthropic",
]);

type ModelRegistration = {
  name: string;
  displayName?: string;
  apiName?: string;
  isToolCallUnsupported?: boolean;
  isImageInputUnsupported?: boolean;
};

const allModels: Record<string, Record<string, LanguageModel>> = {};
const modelMetadata = new Map<
  string,
  {
    displayName?: string;
    isToolCallUnsupported: boolean;
    isImageInputUnsupported: boolean;
  }
>();
const modelInstanceLookup = new WeakMap<LanguageModel, string>();

const fallbackToolUnsupportedKeys = new Set([
  modelKey("openai", "o4-mini"),
  modelKey("ollama", "gemma3:1b"),
  modelKey("ollama", "gemma3:4b"),
  modelKey("ollama", "gemma3:12b"),
  modelKey("openRouter", "openai/gpt-oss-20b:free"),
  modelKey("openRouter", "qwen/qwen3-8b:free"),
  modelKey("openRouter", "qwen/qwen3-14b:free"),
  modelKey("openRouter", "deepseek/deepseek-r1-0528:free"),
  modelKey("openRouter", "google/gemini-2.0-flash-exp:free"),
]);

function hasValidKey(key?: string | null) {
  return !!key && key !== "****";
}

function modelKey(provider: string, name: string) {
  return `${provider}::${name}`;
}

function registerModel(
  provider: string,
  name: string,
  options: RegisterOptions = {},
) {
  const factory = providerFactories[provider];
  const modelInstance =
    options.model || (factory ? factory(options.apiName || name) : undefined);
  if (!modelInstance) {
    return;
  }
  if (!allModels[provider]) {
    allModels[provider] = {};
  }
  allModels[provider][name] = modelInstance;
  const key = modelKey(provider, name);
  modelMetadata.set(key, {
    displayName: options.displayName,
    isToolCallUnsupported:
      options.isToolCallUnsupported ?? fallbackToolUnsupportedKeys.has(key),
    isImageInputUnsupported:
      options.isImageInputUnsupported ??
      !imageInputSupportedProviders.has(provider),
  });
  modelInstanceLookup.set(modelInstance, key);
}

function clearProvider(provider: string) {
  delete allModels[provider];
  const keys: string[] = [];
  for (const key of modelMetadata.keys()) {
    if (key.startsWith(`${provider}::`)) {
      keys.push(key);
    }
  }
  keys.forEach((key) => modelMetadata.delete(key));
}

const staticModelSeed: Record<string, ModelRegistration[]> = {
  openai: [
    { name: "gpt-4.1" },
    { name: "gpt-4.1-mini" },
    { name: "o4-mini" },
    { name: "o3" },
    { name: "gpt-5" },
    { name: "gpt-5-mini" },
    { name: "gpt-5-nano" },
  ],
  google: [
    { name: "gemini-2.5-flash-lite" },
    { name: "gemini-2.5-flash" },
    { name: "gemini-2.5-pro" },
  ],
  anthropic: [
    { name: "claude-sonnet-4-5", displayName: "sonnet-4.5" },
    { name: "claude-opus-4-1", displayName: "opus-4.1" },
  ],
  xai: [
    { name: "grok-4-fast-non-reasoning", displayName: "grok-4-fast" },
    { name: "grok-4" },
    { name: "grok-3" },
    { name: "grok-3-mini" },
  ],
  ollama: [
    { name: "gemma3:1b" },
    { name: "gemma3:4b" },
    { name: "gemma3:12b" },
  ],
  groq: [
    {
      name: "moonshotai/kimi-k2-instruct",
      displayName: "kimi-k2-instruct",
      isImageInputUnsupported: false,
    },
    {
      name: "meta-llama/llama-4-scout-17b-16e-instruct",
      displayName: "llama-4-scout-17b",
      isImageInputUnsupported: false,
    },
    {
      name: "openai/gpt-oss-20b",
      displayName: "gpt-oss-20b",
      isImageInputUnsupported: false,
    },
    {
      name: "openai/gpt-oss-120b",
      displayName: "gpt-oss-120b",
      isImageInputUnsupported: false,
    },
    {
      name: "qwen/qwen3-32b",
      displayName: "qwen3-32b",
      isImageInputUnsupported: false,
    },
  ],
  openRouter: [
    {
      name: "openai/gpt-oss-20b:free",
      displayName: "gpt-oss-20b:free",
      isImageInputUnsupported: false,
    },
    {
      name: "qwen/qwen3-8b:free",
      displayName: "qwen3-8b:free",
      isImageInputUnsupported: false,
    },
    {
      name: "qwen/qwen3-14b:free",
      displayName: "qwen3-14b:free",
      isImageInputUnsupported: false,
    },
    {
      name: "qwen/qwen3-coder:free",
      displayName: "qwen3-coder:free",
      isImageInputUnsupported: false,
    },
    {
      name: "deepseek/deepseek-r1-0528:free",
      displayName: "deepseek-r1:free",
      isImageInputUnsupported: false,
    },
    {
      name: "deepseek/deepseek-chat-v3-0324:free",
      displayName: "deepseek-v3:free",
      isImageInputUnsupported: false,
    },
    {
      name: "google/gemini-2.0-flash-exp:free",
      displayName: "gemini-2.0-flash-exp:free",
      isImageInputUnsupported: false,
    },
  ],
};

Object.entries(staticModelSeed).forEach(([provider, models]) => {
  models.forEach((entry) => {
    registerModel(provider, entry.name, {
      displayName: entry.displayName,
      apiName: entry.apiName,
      isToolCallUnsupported:
        entry.isToolCallUnsupported ??
        fallbackToolUnsupportedKeys.has(modelKey(provider, entry.name)),
      isImageInputUnsupported: entry.isImageInputUnsupported,
    });
  });
});

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

openaiCompatibleProviders.forEach((provider) => {
  providerHasExplicitKey.set(provider.provider, hasValidKey(provider.apiKey));
});

Object.entries(openaiCompatibleModels).forEach(([provider, models]) => {
  Object.entries(models).forEach(([name, model]) => {
    registerModel(provider, name, {
      model,
      displayName: name,
      isToolCallUnsupported: openaiCompatibleUnsupportedModels.has(model),
      isImageInputUnsupported: false,
    });
  });
});

const fallbackProvider = "openai";
const fallbackModelName = "gpt-4.1";
const fallbackModel = () => {
  const providerModels = allModels[fallbackProvider];
  if (providerModels?.[fallbackModelName]) {
    return providerModels[fallbackModelName];
  }
  const created = providerFactories[fallbackProvider]?.(fallbackModelName);
  if (created) {
    registerModel(fallbackProvider, fallbackModelName, { model: created });
    return created;
  }
  throw new Error("Fallback model is not available");
};

let lastRefreshAt = 0;
let currentRefresh: Promise<void> | null = null;

async function refreshModels(force = false) {
  if (!force && Date.now() - lastRefreshAt < 1000 * 60 * 5) {
    return;
  }
  if (currentRefresh) {
    return currentRefresh;
  }
  currentRefresh = (async () => {
    const fetchers: Record<string, () => Promise<ModelRegistration[]>> = {
      openai: fetchOpenAIModels,
      google: fetchGoogleModels,
      anthropic: fetchAnthropicModels,
      xai: fetchXaiModels,
      groq: fetchGroqModels,
      openRouter: fetchOpenRouterModels,
      ollama: fetchOllamaModels,
    };
    const results = await Promise.all(
      Object.entries(fetchers).map(async ([provider, loader]) => {
        try {
          if (!checkProviderAPIKey(provider)) {
            return { provider, models: [] as ModelRegistration[] };
          }
          const models = await loader();
          return { provider, models };
        } catch {
          return { provider, models: [] as ModelRegistration[] };
        }
      }),
    );
    results.forEach(({ provider, models }) => {
      if (!models.length) {
        return;
      }
      clearProvider(provider);
      models.forEach((entry) => {
        registerModel(provider, entry.name, {
          displayName: entry.displayName,
          apiName: entry.apiName,
          isToolCallUnsupported: entry.isToolCallUnsupported,
          isImageInputUnsupported: entry.isImageInputUnsupported,
        });
      });
    });
    lastRefreshAt = Date.now();
  })();
  await currentRefresh;
  currentRefresh = null;
}

function buildModelsInfo() {
  return Object.entries(allModels)
    .map(([provider, models]) => {
      const entries = Object.keys(models)
        .map((name) => {
          const meta = modelMetadata.get(modelKey(provider, name));
          return {
            name,
            displayName:
              meta?.displayName && meta.displayName !== name
                ? meta.displayName
                : undefined,
            isToolCallUnsupported: meta?.isToolCallUnsupported ?? false,
            isImageInputUnsupported:
              meta?.isImageInputUnsupported ??
              !imageInputSupportedProviders.has(provider),
          };
        })
        .sort((a, b) => {
          const labelA = a.displayName || a.name;
          const labelB = b.displayName || b.name;
          return labelA.localeCompare(labelB, undefined, {
            sensitivity: "base",
          });
        });
      return {
        provider,
        hasAPIKey: checkProviderAPIKey(provider),
        models: entries,
      };
    })
    .sort((a, b) => a.provider.localeCompare(b.provider));
}

function checkProviderAPIKey(provider: string) {
  if (providerHasExplicitKey.has(provider)) {
    return providerHasExplicitKey.get(provider)!;
  }
  const checker = providerKeyCheckers[provider];
  if (checker) {
    return checker();
  }
  return true;
}

async function fetchOpenAIModels(): Promise<ModelRegistration[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!hasValidKey(key)) {
    return [];
  }
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load OpenAI models");
  }
  const data = await response.json();
  const seen = new Set<string>();
  return (data.data as { id: string }[])
    .map((item) => item.id)
    .filter((id) => {
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((name) => ({ name }));
}

async function fetchGoogleModels(): Promise<ModelRegistration[]> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!hasValidKey(key)) {
    return [];
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error("Failed to load Google models");
  }
  const data = await response.json();
  const models =
    (data.models as { name?: string; displayName?: string }[]) || [];
  return models
    .map((model) => {
      const raw = model.name?.replace(/^models\//, "")?.trim();
      const name = raw || model.displayName || "";
      if (!name) {
        return null;
      }
      return {
        name,
        displayName: model.displayName || name,
        isImageInputUnsupported: false,
      };
    })
    .filter((item): item is ModelRegistration => Boolean(item));
}

async function fetchAnthropicModels(): Promise<ModelRegistration[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!hasValidKey(key)) {
    return [];
  }
  const version = process.env.ANTHROPIC_API_VERSION || "2023-06-01";
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": key!,
      "anthropic-version": version,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load Anthropic models");
  }
  const data = await response.json();
  const models = (data.data as { id: string; display_name?: string }[]) || [];
  return models.map((model) => ({
    name: model.id,
    displayName: model.display_name || model.id,
    isImageInputUnsupported: false,
  }));
}

async function fetchXaiModels(): Promise<ModelRegistration[]> {
  const key = process.env.XAI_API_KEY;
  if (!hasValidKey(key)) {
    return [];
  }
  const response = await fetch("https://api.x.ai/v1/models", {
    headers: {
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load xAI models");
  }
  const data = await response.json();
  const models = (data.data as { id: string; name?: string }[]) || [];
  return models.map((model) => ({
    name: model.id,
    displayName: model.name || model.id,
    isImageInputUnsupported: false,
  }));
}

async function fetchGroqModels(): Promise<ModelRegistration[]> {
  const key = process.env.GROQ_API_KEY;
  if (!hasValidKey(key)) {
    return [];
  }
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load Groq models");
  }
  const data = await response.json();
  const models = (data.data as { id: string; owned_by?: string }[]) || [];
  return models.map((model) => ({
    name: model.id,
    displayName: model.id,
    isImageInputUnsupported: false,
  }));
}

async function fetchOpenRouterModels(): Promise<ModelRegistration[]> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!hasValidKey(key)) {
    return [];
  }
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load OpenRouter models");
  }
  const data = await response.json();
  const models = (data.data as { id: string; name?: string }[]) || [];
  return models.map((model) => ({
    name: model.id,
    displayName: model.name || model.id,
    isImageInputUnsupported: false,
  }));
}

async function fetchOllamaModels(): Promise<ModelRegistration[]> {
  const base = process.env.OLLAMA_BASE_URL || "http://localhost:11434/api";
  const url = new URL("tags", base.endsWith("/") ? base : `${base}/`);
  const response = await fetch(url, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load Ollama models");
  }
  const data = await response.json();
  const models = (data.models as { name?: string; model?: string }[]) || [];
  return models
    .map((model) => {
      const id = model.name || model.model;
      if (!id) {
        return null;
      }
      return {
        name: id,
        displayName: id,
      };
    })
    .filter((item): item is ModelRegistration => Boolean(item));
}

export const customModelProvider = {
  get modelsInfo() {
    return buildModelsInfo();
  },
  getModel: (model?: ChatModel): LanguageModel => {
    if (!model) {
      return fallbackModel();
    }
    const providerModels = allModels[model.provider];
    const selected = providerModels?.[model.model];
    if (selected) {
      return selected;
    }
    const fallback = providerFactories[model.provider]?.(model.model);
    if (fallback) {
      registerModel(model.provider, model.model, { model: fallback });
      return fallback;
    }
    return fallbackModel();
  },
  refresh: async (force = false) => {
    await refreshModels(force);
  },
};

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  const key = modelInstanceLookup.get(model);
  if (!key) {
    return false;
  }
  return modelMetadata.get(key)?.isToolCallUnsupported ?? false;
};

export { checkProviderAPIKey };
