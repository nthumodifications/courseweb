import { FunctionCallingConfigMode, GoogleGenAI, Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";
import type { Context } from "hono";
import { TOOL_DECLARATIONS, executeTool } from "../chat/tools";
import { buildSystemPrompt } from "../chat/system-prompt";
import type { ChatMessage, UserContext } from "../chat/types";

export type ProviderName =
  | "gemini"
  | "groq"
  | "cerebras"
  | "openrouter"
  | "mistral"
  | "workers-ai";
export type LLMErrorCode =
  | "quota"
  | "auth"
  | "unavailable"
  | "bad_request"
  | "unknown";

export interface WorkerAI {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
  toMarkdown?:
    | ((file: { name: string; blob: Blob }) => Promise<{
        name: string;
        mimeType: string;
        format: "markdown";
        data: string;
      }>)
    | {
        transform(file: { name: string; blob: Blob }): Promise<{
          name: string;
          mimeType: string;
          format: "markdown";
          data: string;
        }>;
      };
}

export interface LlmEnv {
  GOOGLE_AI_API_KEY?: string;
  GROQ_API_KEY?: string;
  CEREBRAS_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  AI?: unknown;
  AI_PROVIDER_ORDER?: string;
  GEMINI_CHAT_MODELS?: string;
  GEMINI_SUMMARY_MODELS?: string;
  GEMINI_BULK_MODELS?: string;
  GROQ_CHAT_MODELS?: string;
  CEREBRAS_CHAT_MODELS?: string;
  OPENROUTER_CHAT_MODELS?: string;
  MISTRAL_CHAT_MODELS?: string;
  WORKERS_AI_CHAT_MODELS?: string;
}

export const DEFAULT_GEMINI_CHAT_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
] as const;

export const DEFAULT_GEMINI_SUMMARY_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
] as const;

export const DEFAULT_GROQ_CHAT_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
] as const;

export const DEFAULT_CEREBRAS_CHAT_MODELS = [
  "gpt-oss-120b",
  "qwen-3.8-27b",
] as const;

// Keep these pinned to current :free model IDs. OpenRouter's free router is
// intentionally not used because it does not guarantee a free model slug.
export const DEFAULT_OPENROUTER_CHAT_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

export const DEFAULT_MISTRAL_CHAT_MODELS = [
  "mistral-small-latest",
  "ministral-8b-latest",
] as const;

export const DEFAULT_WORKERS_AI_CHAT_MODELS = [
  "@cf/openai/gpt-oss-120b",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
] as const;

const DEAD_PROVIDER_CACHE = new Map<string, number>();
const MAX_TURNS = 10;

type OpenAICompatibleProviderName = Exclude<
  ProviderName,
  "gemini" | "workers-ai"
>;

export interface OpenAICompatibleProvider {
  name: OpenAICompatibleProviderName;
  baseUrl: string;
  keyEnv:
    | "GROQ_API_KEY"
    | "CEREBRAS_API_KEY"
    | "OPENROUTER_API_KEY"
    | "MISTRAL_API_KEY";
  modelsEnv:
    | "GROQ_CHAT_MODELS"
    | "CEREBRAS_CHAT_MODELS"
    | "OPENROUTER_CHAT_MODELS"
    | "MISTRAL_CHAT_MODELS";
  defaultModels: readonly string[];
  supportsJsonMode: boolean;
  supportsTools: boolean;
  headers?: Record<string, string>;
}

export const OPENAI_COMPATIBLE_PROVIDERS: readonly OpenAICompatibleProvider[] =
  [
    {
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      keyEnv: "GROQ_API_KEY",
      modelsEnv: "GROQ_CHAT_MODELS",
      defaultModels: DEFAULT_GROQ_CHAT_MODELS,
      supportsJsonMode: true,
      supportsTools: true,
    },
    {
      name: "cerebras",
      baseUrl: "https://api.cerebras.ai/v1",
      keyEnv: "CEREBRAS_API_KEY",
      modelsEnv: "CEREBRAS_CHAT_MODELS",
      defaultModels: DEFAULT_CEREBRAS_CHAT_MODELS,
      supportsJsonMode: true,
      supportsTools: true,
    },
    {
      name: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      keyEnv: "OPENROUTER_API_KEY",
      modelsEnv: "OPENROUTER_CHAT_MODELS",
      defaultModels: DEFAULT_OPENROUTER_CHAT_MODELS,
      supportsJsonMode: true,
      supportsTools: true,
      headers: {
        "HTTP-Referer": "https://nthumods.com",
        "X-Title": "NTHUMods",
      },
    },
    {
      name: "mistral",
      baseUrl: "https://api.mistral.ai/v1",
      keyEnv: "MISTRAL_API_KEY",
      modelsEnv: "MISTRAL_CHAT_MODELS",
      defaultModels: DEFAULT_MISTRAL_CHAT_MODELS,
      supportsJsonMode: true,
      supportsTools: true,
    },
  ];

const DEFAULT_PROVIDER_ORDER = new Set<ProviderName>([
  "gemini",
  "groq",
  "cerebras",
  "openrouter",
  "mistral",
  "workers-ai",
]);

export type JsonSchema = Record<string, unknown>;

export interface ProviderErrorClassification {
  code: LLMErrorCode;
  status?: number;
  message: string;
}

export class LLMProviderError extends Error {
  readonly provider: ProviderName;
  readonly model: string;
  readonly code: LLMErrorCode;
  readonly status?: number;
  readonly userSuppliedKey: boolean;

  constructor(
    provider: ProviderName,
    model: string,
    classification: ProviderErrorClassification,
    userSuppliedKey = false,
  ) {
    super(classification.message);
    this.name = "LLMProviderError";
    this.provider = provider;
    this.model = model;
    this.code = classification.code;
    this.status = classification.status;
    this.userSuppliedKey = userSuppliedKey;
  }
}

function getStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    const value = (error as { status?: unknown }).status;
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^\d{3}$/.test(value)) {
      return Number(value);
    }
    const response = (error as { response?: { status?: unknown } }).response;
    if (response && typeof response.status === "number") return response.status;
  }

  const text = error instanceof Error ? error.message : String(error);
  const match = text.match(/\b([245]\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown provider error";
  }
}

/** Classifies SDK and HTTP errors into the public stream error vocabulary. */
export function classifyProviderError(
  error: unknown,
): ProviderErrorClassification {
  const message = getErrorText(error);
  const status = getStatus(error);
  const lower = message.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    (status === 400 &&
      (lower.includes("api key") ||
        lower.includes("api_key") ||
        lower.includes("invalid key") ||
        lower.includes("authentication")))
  ) {
    return { code: "auth", status, message };
  }
  if (status === 402 || status === 429 || lower.includes("quota")) {
    return { code: "quota", status, message };
  }
  if (status === 404 || (status !== undefined && status >= 500)) {
    return { code: "unavailable", status, message };
  }
  if (status !== undefined && status >= 400) {
    return { code: "bad_request", status, message };
  }
  if (
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("fetch failed")
  ) {
    return { code: "unavailable", status, message };
  }
  return { code: "unknown", status, message };
}

function deadCacheTtl(
  provider: ProviderName,
  classification: ProviderErrorClassification,
): number {
  const lower = classification.message.toLowerCase();
  const dailyQuota =
    classification.status === 429 &&
    /(daily|per day|requests?\s*\/\s*day|requests?\s+per\s+day|day limit)/.test(
      lower,
    );
  const openRouterFreeQuota =
    provider === "openrouter" &&
    classification.status === 402 &&
    /(insufficient credits|free model|balance|credits)/.test(lower);
  if (dailyQuota || openRouterFreeQuota) {
    return 24 * 60 * 60 * 1000;
  }
  if (
    classification.code === "auth" ||
    classification.status === 402 ||
    classification.status === 401
  ) {
    return 10 * 60 * 1000;
  }
  if (
    classification.status === 403 ||
    classification.status === 404 ||
    classification.status === 429 ||
    (classification.status !== undefined && classification.status >= 500)
  ) {
    return classification.status === 404 || classification.status === 403
      ? 10 * 60 * 1000
      : 60 * 1000;
  }
  return 0;
}

function isDead(provider: ProviderName, model: string): boolean {
  const expiresAt = DEAD_PROVIDER_CACHE.get(`${provider}:${model}`);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    DEAD_PROVIDER_CACHE.delete(`${provider}:${model}`);
    return false;
  }
  return true;
}

function rememberDead(
  provider: ProviderName,
  model: string,
  classification: ProviderErrorClassification,
): void {
  const ttl = deadCacheTtl(provider, classification);
  if (ttl > 0) {
    DEAD_PROVIDER_CACHE.set(`${provider}:${model}`, Date.now() + ttl);
  }
}

function modelsFromEnv(value: string | undefined, defaults: readonly string[]) {
  const models = value
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return models?.length ? models : [...defaults];
}

function lowerType(value: unknown): string {
  if (typeof value !== "string") return "string";
  const type = value.toLowerCase();
  return type === "type_unspecified" || type === "null" ? "string" : type;
}

/** Converts the restricted Gemini tool schema to OpenAI function-tool JSON Schema. */
export function convertSchemaToJsonSchema(value: unknown): JsonSchema {
  if (!value || typeof value !== "object") return { type: "object" };
  const input = value as Record<string, unknown>;
  const output: JsonSchema = {};

  if (input.type !== undefined) output.type = lowerType(input.type);
  if (typeof input.description === "string") {
    output.description = input.description;
  }
  if (Array.isArray(input.required)) {
    output.required = input.required.filter(
      (item): item is string => typeof item === "string",
    );
  }
  if (Array.isArray(input.enum)) output.enum = input.enum;
  if (input.items !== undefined) {
    output.items = convertSchemaToJsonSchema(input.items);
  }
  if (input.properties && typeof input.properties === "object") {
    const properties: JsonSchema = {};
    for (const [name, schema] of Object.entries(
      input.properties as Record<string, unknown>,
    )) {
      properties[name] = convertSchemaToJsonSchema(schema);
    }
    output.properties = properties;
  }
  return output;
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: JsonSchema;
  };
}

export function convertToolDeclarations(
  declarations: FunctionDeclaration[] = TOOL_DECLARATIONS,
): OpenAITool[] {
  return declarations.flatMap((declaration) => {
    if (!declaration.name) return [];
    return [
      {
        type: "function",
        function: {
          name: declaration.name,
          ...(declaration.description
            ? { description: declaration.description }
            : {}),
          parameters: convertSchemaToJsonSchema(
            declaration.parameters ?? { type: Type.OBJECT, properties: {} },
          ),
        },
      },
    ];
  });
}

export function validateAgainstSchema(
  value: unknown,
  schema: unknown,
): boolean {
  if (!schema || typeof schema !== "object") return true;
  const definition = schema as Record<string, unknown>;
  const type = lowerType(definition.type);

  if (Array.isArray(definition.enum) && !definition.enum.includes(value)) {
    return false;
  }
  if (type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    const record = value as Record<string, unknown>;
    const required = Array.isArray(definition.required)
      ? definition.required.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    if (required.some((key) => !(key in record))) return false;
    if (definition.properties && typeof definition.properties === "object") {
      for (const [key, propertySchema] of Object.entries(
        definition.properties as Record<string, unknown>,
      )) {
        if (
          key in record &&
          !validateAgainstSchema(record[key], propertySchema)
        ) {
          return false;
        }
      }
    }
    return true;
  }
  if (type === "array") {
    return (
      Array.isArray(value) &&
      (definition.items === undefined ||
        value.every((item) => validateAgainstSchema(item, definition.items)))
    );
  }
  if (type === "string") return typeof value === "string";
  if (type === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (type === "integer")
    return typeof value === "number" && Number.isInteger(value);
  if (type === "boolean") return typeof value === "boolean";
  return true;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

interface LoadedPdf {
  bytes: Uint8Array;
  blob: Blob;
  /** toMarkdown result, shared by every text-only provider in one call. */
  markdownBody?: Promise<string>;
}

async function loadPdf(pdf: {
  url?: string;
  bytes?: ArrayBuffer | Uint8Array;
}): Promise<LoadedPdf> {
  if (pdf.bytes) {
    const bytes =
      pdf.bytes instanceof Uint8Array ? pdf.bytes : new Uint8Array(pdf.bytes);
    return { bytes, blob: new Blob([bytes], { type: "application/pdf" }) };
  }
  if (!pdf.url) throw new Error("PDF input must include url or bytes");
  const response = await fetch(pdf.url);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, blob: new Blob([bytes], { type: "application/pdf" }) };
}

async function pdfMarkdown(env: LlmEnv, pdf: LoadedPdf): Promise<string> {
  const ai = env.AI as WorkerAI | undefined;
  if (!ai?.toMarkdown)
    throw new Error("Workers AI PDF conversion is unavailable");
  const file = {
    name: "document.pdf",
    blob: pdf.blob,
  };
  const converted: unknown =
    typeof ai.toMarkdown === "function"
      ? await ai.toMarkdown(file)
      : await ai.toMarkdown.transform(file);
  // The binding returns one result for one file, but older runtimes wrap it in an array.
  const result = Array.isArray(converted) ? converted[0] : converted;
  const data = (result as { data?: unknown } | undefined)?.data;
  if (typeof data !== "string" || !data.trim()) {
    throw new Error("Workers AI PDF conversion returned no text");
  }
  return data;
}

/**
 * toMarkdown always emits a title, a metadata list and "### Page N" headings,
 * even for PDFs whose text it cannot read (the PEO timetables are Excel
 * exports and come back empty). Strip that scaffolding to see what is left.
 */
export function pdfMarkdownBody(markdown: string): string {
  const contents = markdown.split(/^## Contents\s*$/m)[1] ?? markdown;
  return contents
    .replace(/^#{1,6} .*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MIN_PDF_TEXT = 80;

/**
 * Text-only providers see a PDF only through toMarkdown. When that yields
 * nothing usable, a PDF-only task must fail over rather than let the model
 * answer from an empty document; otherwise the task goes ahead on the rest.
 */
async function withPdfText(
  text: string,
  options: GenerateJsonOptions,
  pdf: LoadedPdf | undefined,
): Promise<string> {
  if (!pdf) return text;
  pdf.markdownBody ??= pdfMarkdown(options.env, pdf)
    .then(pdfMarkdownBody)
    .catch(() => "");
  const body = await pdf.markdownBody;
  if (body.length >= MIN_PDF_TEXT) return `${text}\n\nPDF contents:\n${body}`;
  if (options.pdfRequired) {
    throw new Error("The PDF has no text this provider can read");
  }
  return text;
}

export interface WorkersAiOutput {
  text: string;
  toolCalls: Array<{ id: string; name: string; args: unknown }>;
}

/**
 * Workers AI answers in two shapes depending on the model: OpenAI-style
 * `choices[0].message` (gpt-oss, and newer models alongside the legacy
 * fields) or the legacy `response` / `tool_calls`, where `response` may
 * already be a parsed object when JSON mode is on.
 */
export function normalizeWorkersAiOutput(output: unknown): WorkersAiOutput {
  if (typeof output === "string") return { text: output, toolCalls: [] };
  if (!output || typeof output !== "object") {
    throw new Error("Workers AI returned an invalid response");
  }
  type RawCall = {
    id?: string;
    function?: { name?: string; arguments?: unknown };
    name?: string;
    arguments?: unknown;
  };
  const body = output as {
    response?: unknown;
    tool_calls?: RawCall[];
    choices?: Array<{
      message?: { content?: unknown; tool_calls?: RawCall[] };
    }>;
  };
  const message = body.choices?.[0]?.message;

  let text = "";
  if (typeof message?.content === "string") text = message.content;
  else if (typeof body.response === "string") text = body.response;
  else if (body.response && typeof body.response === "object") {
    text = JSON.stringify(body.response);
  }

  const rawCalls = message?.tool_calls?.length
    ? message.tool_calls
    : (body.tool_calls ?? []);
  const toolCalls = rawCalls.flatMap((call, index) => {
    const name = call.function?.name ?? call.name;
    if (!name) return [];
    return [
      {
        id: call.id ?? `call_${index}`,
        name,
        args: call.function?.arguments ?? call.arguments,
      },
    ];
  });
  return { text, toolCalls };
}

function parseJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export interface GenerateJsonOptions {
  env: LlmEnv;
  system: string;
  text: string;
  pdf?: { url?: string; bytes?: ArrayBuffer | Uint8Array };
  schema: JsonSchema;
  userGeminiKey?: string;
  purpose?: "chat" | "summary" | "bulk";
  /** The PDF is the only source; skip providers that cannot read it. */
  pdfRequired?: boolean;
}

export interface GenerateJsonResult<T = unknown> {
  data: T;
  provider: ProviderName;
  model: string;
}

interface ProviderAttempt {
  provider: ProviderName;
  model: string;
  apiKey?: string;
  userSuppliedKey?: boolean;
}

function getOpenAIProvider(
  provider: ProviderName,
): OpenAICompatibleProvider | undefined {
  return OPENAI_COMPATIBLE_PROVIDERS.find(
    (candidate) => candidate.name === provider,
  );
}

function getProviderKey(
  env: LlmEnv,
  provider: OpenAICompatibleProvider,
): string | undefined {
  const value = env[provider.keyEnv];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function providerOrder(env: LlmEnv): ProviderName[] {
  const configured = env.AI_PROVIDER_ORDER?.split(",")
    .map((name) => name.trim() as ProviderName)
    .filter((name): name is ProviderName => DEFAULT_PROVIDER_ORDER.has(name));
  const requested = configured?.length
    ? configured
    : [...DEFAULT_PROVIDER_ORDER];
  return [...new Set([...requested, ...DEFAULT_PROVIDER_ORDER])];
}

function addGeminiAttempts(
  attempts: ProviderAttempt[],
  models: string[],
  apiKey: string,
  userSuppliedKey = false,
): void {
  for (const model of models) {
    attempts.push({
      provider: "gemini",
      model,
      apiKey,
      userSuppliedKey,
    });
  }
}

function providerAttempts(
  env: LlmEnv,
  purpose: "chat" | "summary" | "bulk",
  userGeminiKey?: string,
): ProviderAttempt[] {
  const attempts: ProviderAttempt[] = [];
  const geminiDefaults =
    purpose === "chat"
      ? DEFAULT_GEMINI_CHAT_MODELS
      : DEFAULT_GEMINI_SUMMARY_MODELS;
  const geminiEnv =
    purpose === "chat"
      ? env.GEMINI_CHAT_MODELS
      : (env.GEMINI_SUMMARY_MODELS ?? env.GEMINI_BULK_MODELS);
  const geminiModels = modelsFromEnv(geminiEnv, geminiDefaults);

  // A user key is always tried before any server-configured provider. The
  // optional order still controls the rest of the chain, including whether
  // the server Gemini key is before or after another configured provider.
  if (userGeminiKey) {
    addGeminiAttempts(attempts, geminiModels, userGeminiKey, true);
  }

  for (const provider of providerOrder(env)) {
    if (provider === "gemini") {
      if (env.GOOGLE_AI_API_KEY) {
        addGeminiAttempts(attempts, geminiModels, env.GOOGLE_AI_API_KEY);
      }
      continue;
    }
    if (provider === "workers-ai") {
      if (!env.AI) continue;
      const models = modelsFromEnv(
        env.WORKERS_AI_CHAT_MODELS,
        DEFAULT_WORKERS_AI_CHAT_MODELS,
      );
      for (const model of models) attempts.push({ provider, model });
      continue;
    }
    const config = getOpenAIProvider(provider);
    if (!config) continue;
    const apiKey = getProviderKey(env, config);
    if (!apiKey) continue;
    const models = modelsFromEnv(env[config.modelsEnv], config.defaultModels);
    for (const model of models) attempts.push({ provider, model });
  }
  return attempts;
}

async function generateGeminiJson(
  attempt: ProviderAttempt,
  options: GenerateJsonOptions,
  pdf: LoadedPdf | undefined,
): Promise<unknown> {
  if (!attempt.apiKey) throw new Error("Gemini API key is not configured");
  const ai = new GoogleGenAI({ apiKey: attempt.apiKey });
  const parts: Array<Record<string, unknown>> = [{ text: options.text }];
  if (pdf) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: encodeBase64(pdf.bytes),
      },
    });
  }
  const response = await ai.models.generateContent({
    model: attempt.model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: options.system,
      responseMimeType: "application/json",
      responseSchema: options.schema,
    },
  });
  if (!response.text)
    throw new Error("Provider returned an empty JSON response");
  return parseJson(response.text);
}

function strictJsonInstruction(system: string, schema: JsonSchema): string {
  return `${system}\n\nReturn ONLY valid JSON matching this schema. Do not use markdown fences or add commentary.\n${JSON.stringify(schema)}`;
}

async function generateOpenAICompatibleJson(
  attempt: ProviderAttempt,
  options: GenerateJsonOptions,
  pdf: LoadedPdf | undefined,
): Promise<unknown> {
  const provider = getOpenAIProvider(attempt.provider);
  if (!provider)
    throw new Error(`${attempt.provider} is not OpenAI-compatible`);
  const apiKey = getProviderKey(options.env, provider);
  if (!apiKey) throw new Error(`${attempt.provider} API key is not configured`);
  const text = await withPdfText(options.text, options, pdf);
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...provider.headers,
    },
    body: JSON.stringify({
      model: attempt.model,
      messages: [
        {
          role: "system",
          content: strictJsonInstruction(options.system, options.schema),
        },
        { role: "user", content: text },
      ],
      ...(provider.supportsJsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
      temperature: 0.1,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `${attempt.provider} ${response.status}: ${await response.text()}`,
    );
  }
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const output = body.choices?.[0]?.message?.content;
  if (!output)
    throw new Error(`${attempt.provider} returned an empty JSON response`);
  return parseJson(output);
}

async function generateWorkersJson(
  attempt: ProviderAttempt,
  options: GenerateJsonOptions,
  pdf: LoadedPdf | undefined,
): Promise<unknown> {
  const ai = options.env.AI as WorkerAI | undefined;
  if (!ai) throw new Error("Workers AI is not configured");
  const text = await withPdfText(options.text, options, pdf);
  const output = await ai.run(attempt.model, {
    messages: [
      {
        role: "system",
        content: strictJsonInstruction(options.system, options.schema),
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    guided_json: options.schema,
    temperature: 0.1,
    // Reasoning models (gpt-oss) spend tokens thinking first; the default cap
    // cuts the JSON off mid-object.
    max_tokens: 4096,
  });
  return parseJson(normalizeWorkersAiOutput(output).text);
}

async function runJsonProvider(
  attempt: ProviderAttempt,
  options: GenerateJsonOptions,
  pdf: LoadedPdf | undefined,
): Promise<unknown> {
  try {
    if (attempt.provider === "gemini")
      return await generateGeminiJson(attempt, options, pdf);
    if (attempt.provider !== "workers-ai") {
      return await generateOpenAICompatibleJson(attempt, options, pdf);
    }
    return await generateWorkersJson(attempt, options, pdf);
  } catch (error) {
    throw new LLMProviderError(
      attempt.provider,
      attempt.model,
      classifyProviderError(error),
      attempt.userSuppliedKey,
    );
  }
}

export async function generateJSON<T = unknown>(
  options: GenerateJsonOptions,
): Promise<GenerateJsonResult<T>> {
  const attempts = providerAttempts(
    options.env,
    options.purpose ?? "summary",
    options.userGeminiKey,
  );
  if (attempts.length === 0) {
    throw new LLMProviderError("workers-ai", "none", {
      code: "unavailable",
      message: "No AI provider is configured",
    });
  }
  const pdf = options.pdf
    ? await loadPdf(options.pdf).catch((error) => {
        throw new LLMProviderError(
          "gemini",
          "pdf",
          classifyProviderError(error),
        );
      })
    : undefined;
  let lastError: LLMProviderError | undefined;

  for (const attempt of attempts) {
    if (!attempt.userSuppliedKey && isDead(attempt.provider, attempt.model))
      continue;
    try {
      const data = await runJsonProvider(attempt, options, pdf);
      if (!validateAgainstSchema(data, options.schema)) {
        throw new LLMProviderError(
          attempt.provider,
          attempt.model,
          {
            code: "unknown",
            message: "Provider returned JSON that does not match the schema",
          },
          attempt.userSuppliedKey,
        );
      }
      return {
        data: data as T,
        provider: attempt.provider,
        model: attempt.model,
      };
    } catch (error) {
      const providerError =
        error instanceof LLMProviderError
          ? error
          : new LLMProviderError(
              attempt.provider,
              attempt.model,
              classifyProviderError(error),
              attempt.userSuppliedKey,
            );
      lastError = providerError;
      const providerStatus = providerError.status
        ? ` ${providerError.status}`
        : "";
      console.warn(
        `[ai] ${options.purpose ?? "summary"} ${attempt.provider}/${attempt.model} failed (${providerError.code}${providerStatus}): ${providerError.message.slice(0, 300)}`,
      );
      if (providerError.userSuppliedKey && providerError.code === "auth")
        throw providerError;
      if (!providerError.userSuppliedKey) {
        rememberDead(attempt.provider, attempt.model, {
          code: providerError.code,
          status: providerError.status,
          message: providerError.message,
        });
      }
    }
  }
  throw (
    lastError ??
    new LLMProviderError("workers-ai", "none", {
      code: "unavailable",
      message: "All AI providers failed",
    })
  );
}

export interface TestKeyResult {
  ok: boolean;
  model?: string;
  code?: Exclude<LLMErrorCode, "bad_request" | "unknown">;
  error?: string;
}

export async function testGeminiKey(
  apiKey: string,
  model = DEFAULT_GEMINI_SUMMARY_MODELS[0],
): Promise<TestKeyResult> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: 'Reply with the JSON object {"ok":true}.',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { ok: { type: Type.BOOLEAN } },
          required: ["ok"],
        },
      },
    });
    const data = response.text ? parseJson(response.text) : undefined;
    if (
      !data ||
      typeof data !== "object" ||
      (data as { ok?: unknown }).ok !== true
    ) {
      return {
        ok: false,
        code: "unavailable",
        error: "Gemini returned an invalid response",
      };
    }
    return { ok: true, model };
  } catch (error) {
    const classification = classifyProviderError(error);
    const code =
      classification.code === "auth" || classification.code === "quota"
        ? classification.code
        : "unavailable";
    return {
      ok: false,
      code,
      error: readableProviderMessage(classification.message),
    };
  }
}

/** Google errors arrive as a JSON string; the user only needs its message. */
export function readableProviderMessage(message: string): string {
  const start = message.indexOf("{");
  if (start >= 0) {
    try {
      const parsed = JSON.parse(message.slice(start)) as {
        error?: { message?: unknown };
      };
      if (typeof parsed.error?.message === "string")
        return parsed.error.message.trim();
    } catch {
      // Not JSON after all; fall through to the raw text.
    }
  }
  return message.slice(0, 300);
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

interface HistoryMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  toolCallId?: string;
  name?: string;
}

export type ChatStreamEvent =
  | { type: "meta"; data: { provider: ProviderName; model: string } }
  | { type: "text"; data: string }
  | { type: "tool_call"; data: { name: string; args: Record<string, unknown> } }
  | {
      type: "tool_result";
      data: { name: string; result?: unknown; error?: string };
    }
  | { type: "done" }
  | { type: "error"; data: string; code: LLMErrorCode };

interface ProviderTurnResult {
  text: string;
  toolCalls: ToolCall[];
}

type ProviderEvent =
  | { type: "text"; data: string }
  | { type: "tool_call"; data: { name: string; args: Record<string, unknown> } }
  | {
      type: "tool_result";
      data: { name: string; result?: unknown; error?: string };
    };

function asToolArgs(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

async function* executeToolCalls(
  c: Context,
  calls: ToolCall[],
  userContext: UserContext,
): AsyncGenerator<ProviderEvent> {
  for (const call of calls) {
    yield { type: "tool_call", data: { name: call.name, args: call.args } };
    try {
      call.result = await executeTool(c, call.name, call.args, userContext);
      yield {
        type: "tool_result",
        data: { name: call.name, result: call.result },
      };
    } catch (error) {
      call.error =
        error instanceof Error ? error.message : "Tool execution failed";
      yield {
        type: "tool_result",
        data: { name: call.name, error: call.error },
      };
    }
  }
}

async function historyToGemini(
  history: HistoryMessage[],
  pdfCache: Map<string, LoadedPdf>,
): Promise<Array<{ role: string; parts: Array<Record<string, unknown>> }>> {
  const output: Array<{ role: string; parts: Array<Record<string, unknown>> }> =
    [];
  for (const message of history) {
    if (message.role === "user") {
      output.push({ role: "user", parts: [{ text: message.content }] });
    } else if (message.role === "assistant") {
      const parts: Array<Record<string, unknown>> = [];
      if (message.content) parts.push({ text: message.content });
      for (const call of message.toolCalls ?? []) {
        parts.push({
          functionCall: { name: call.name, args: call.args, id: call.id },
        });
      }
      output.push({ role: "model", parts });
    } else {
      let response: unknown = message.content;
      try {
        response = JSON.parse(message.content);
      } catch {
        // Keep non-JSON tool errors as a string below.
      }
      const parts: Array<Record<string, unknown>> = [
        {
          functionResponse: {
            name: message.name,
            id: message.toolCallId,
            response:
              response && typeof response === "object"
                ? response
                : { result: response },
          },
        },
      ];
      if (
        response &&
        typeof response === "object" &&
        "uploadToGemini" in response &&
        typeof (response as { pdfUrl?: unknown }).pdfUrl === "string"
      ) {
        const pdfUrl = (response as unknown as { pdfUrl: string }).pdfUrl;
        let pdf = pdfCache.get(pdfUrl);
        if (!pdf) {
          pdf = await loadPdf({ url: pdfUrl });
          pdfCache.set(pdfUrl, pdf);
        }
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: encodeBase64(pdf.bytes),
          },
        });
      }
      output.push({ role: "user", parts });
    }
  }
  return output;
}

async function* runGeminiTurn(
  c: Context,
  attempt: ProviderAttempt,
  history: HistoryMessage[],
  userContext: UserContext,
  pdfCache: Map<string, LoadedPdf>,
): AsyncGenerator<ProviderEvent, ProviderTurnResult> {
  if (!attempt.apiKey) throw new Error("Gemini API key is not configured");
  const ai = new GoogleGenAI({ apiKey: attempt.apiKey });
  const response = await ai.models.generateContentStream({
    model: attempt.model,
    contents: await historyToGemini(history, pdfCache),
    config: {
      systemInstruction: buildSystemPrompt(userContext),
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
      },
    },
  });
  const calls = new Map<string, ToolCall>();
  let text = "";
  for await (const chunk of response) {
    if (chunk.text) {
      text += chunk.text;
      yield { type: "text", data: chunk.text };
    }
    for (const functionCall of chunk.functionCalls ?? []) {
      const key =
        functionCall.id ??
        `${functionCall.name}:${JSON.stringify(functionCall.args)}`;
      if (!calls.has(key) && functionCall.name) {
        calls.set(key, {
          id: functionCall.id ?? key,
          name: functionCall.name,
          args: asToolArgs(functionCall.args),
        });
      }
    }
  }
  const toolCalls = [...calls.values()];
  for await (const event of executeToolCalls(c, toolCalls, userContext))
    yield event;
  return { text, toolCalls };
}

interface OpenAIToolAccumulator {
  id: string;
  name: string;
  arguments: string;
}

/** Accumulates one OpenAI-compatible streamed tool-call delta. */
export function accumulateOpenAIToolCallDelta(
  calls: Map<number, OpenAIToolAccumulator>,
  delta: {
    index?: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  },
): void {
  const index = delta.index ?? 0;
  const current = calls.get(index) ?? {
    id: `call_${index}`,
    name: "",
    arguments: "",
  };
  if (delta.id) current.id = delta.id;
  if (delta.function?.name) current.name += delta.function.name;
  if (delta.function?.arguments) current.arguments += delta.function.arguments;
  calls.set(index, current);
}

// Kept as a compatibility export for callers/tests that used the old Groq name.
export const accumulateGroqToolCallDelta = accumulateOpenAIToolCallDelta;
export const accumulateToolCallDelta = accumulateGroqToolCallDelta;

async function* readSse(response: Response): AsyncGenerator<unknown> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!data || data === "[DONE]") continue;
      try {
        yield JSON.parse(data);
      } catch {
        // Ignore comments/partial provider frames.
      }
    }
    if (done) {
      const data = buffer
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (data && data !== "[DONE]") {
        try {
          yield JSON.parse(data);
        } catch {
          // Ignore an incomplete final provider frame.
        }
      }
      break;
    }
  }
}

interface GroqChoiceDelta {
  content?: string | null;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

async function* runOpenAICompatibleTurn(
  c: Context,
  attempt: ProviderAttempt,
  history: HistoryMessage[],
  userContext: UserContext,
): AsyncGenerator<ProviderEvent, ProviderTurnResult> {
  const provider = getOpenAIProvider(attempt.provider);
  if (!provider)
    throw new Error(`${attempt.provider} is not OpenAI-compatible`);
  const env = c.env as unknown as LlmEnv;
  const apiKey = getProviderKey(env, provider);
  if (!apiKey) throw new Error(`${attempt.provider} API key is not configured`);
  const messages = [
    { role: "system", content: buildSystemPrompt(userContext) },
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
      ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
      ...(message.name ? { name: message.name } : {}),
      ...(message.toolCalls?.length
        ? {
            tool_calls: message.toolCalls.map((call) => ({
              id: call.id,
              type: "function",
              function: {
                name: call.name,
                arguments: JSON.stringify(call.args),
              },
            })),
          }
        : {}),
    })),
  ];
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...provider.headers,
    },
    body: JSON.stringify({
      model: attempt.model,
      messages,
      ...(provider.supportsTools
        ? {
            tools: convertToolDeclarations(),
            tool_choice: "auto",
          }
        : {}),
      stream: true,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `${attempt.provider} ${response.status}: ${await response.text()}`,
    );
  }

  let text = "";
  const toolDeltas = new Map<number, OpenAIToolAccumulator>();
  for await (const raw of readSse(response)) {
    const choice = (raw as { choices?: Array<{ delta?: GroqChoiceDelta }> })
      .choices?.[0];
    const delta = choice?.delta;
    if (!delta) continue;
    if (delta.content) {
      text += delta.content;
      yield { type: "text", data: delta.content };
    }
    for (const toolCall of delta.tool_calls ?? []) {
      accumulateGroqToolCallDelta(toolDeltas, toolCall);
    }
  }
  const calls: ToolCall[] = [];
  for (const call of toolDeltas.values()) {
    if (!call.name) continue;
    calls.push({
      id: call.id,
      name: call.name,
      args: asToolArgs(call.arguments),
    });
  }
  for await (const event of executeToolCalls(c, calls, userContext))
    yield event;
  return { text, toolCalls: calls };
}

async function* runWorkersAiTurn(
  c: Context,
  attempt: ProviderAttempt,
  history: HistoryMessage[],
  userContext: UserContext,
): AsyncGenerator<ProviderEvent, ProviderTurnResult> {
  const ai = (c.env as unknown as LlmEnv).AI as WorkerAI | undefined;
  if (!ai) throw new Error("Workers AI is not configured");
  const output = await ai.run(attempt.model, {
    messages: [
      { role: "system", content: buildSystemPrompt(userContext) },
      ...history.map((message) => ({
        role: message.role,
        content: message.content,
        ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
        ...(message.name ? { name: message.name } : {}),
        ...(message.toolCalls?.length
          ? {
              tool_calls: message.toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: {
                  name: call.name,
                  arguments: JSON.stringify(call.args),
                },
              })),
            }
          : {}),
      })),
    ],
    tools: convertToolDeclarations(),
    stream: false,
    max_tokens: 4096,
  });
  const normalized = normalizeWorkersAiOutput(output);
  const text = normalized.text;
  if (text) yield { type: "text", data: text };
  const calls: ToolCall[] = normalized.toolCalls.map((call) => ({
    id: call.id,
    name: call.name,
    args: asToolArgs(call.args),
  }));
  for await (const event of executeToolCalls(c, calls, userContext))
    yield event;
  return { text, toolCalls: calls };
}

async function* runProviderTurn(
  c: Context,
  attempt: ProviderAttempt,
  history: HistoryMessage[],
  userContext: UserContext,
  pdfCache: Map<string, LoadedPdf>,
): AsyncGenerator<ProviderEvent, ProviderTurnResult> {
  try {
    if (attempt.provider === "gemini") {
      return yield* runGeminiTurn(c, attempt, history, userContext, pdfCache);
    }
    if (attempt.provider !== "workers-ai") {
      return yield* runOpenAICompatibleTurn(c, attempt, history, userContext);
    }
    return yield* runWorkersAiTurn(c, attempt, history, userContext);
  } catch (error) {
    throw new LLMProviderError(
      attempt.provider,
      attempt.model,
      classifyProviderError(error),
      attempt.userSuppliedKey,
    );
  }
}

export interface StreamChatOptions {
  env: LlmEnv;
  userGeminiKey?: string;
}

export async function* streamChatWithTools(
  c: Context,
  messages: ChatMessage[],
  userContext: UserContext,
  options: StreamChatOptions,
): AsyncGenerator<ChatStreamEvent> {
  const attempts = providerAttempts(options.env, "chat", options.userGeminiKey);
  const history: HistoryMessage[] = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const pdfCache = new Map<string, LoadedPdf>();
  if (attempts.length === 0) {
    yield {
      type: "error",
      data: "No AI provider is configured",
      code: "unavailable",
    };
    yield { type: "done" };
    return;
  }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let completed = false;
    let needsNextTurn = false;
    let lastError: LLMProviderError | undefined;
    for (const attempt of attempts) {
      if (!attempt.userSuppliedKey && isDead(attempt.provider, attempt.model))
        continue;
      let emittedOutput = false;
      const result = { text: "", toolCalls: [] as ToolCall[] };
      try {
        const generator = runProviderTurn(
          c,
          attempt,
          history,
          userContext,
          pdfCache,
        );
        while (true) {
          const step = await generator.next();
          if (step.done) {
            result.text = step.value.text;
            result.toolCalls = step.value.toolCalls;
            break;
          }
          const event = step.value;
          if (!emittedOutput) {
            emittedOutput = true;
            yield {
              type: "meta",
              data: { provider: attempt.provider, model: attempt.model },
            };
          }
          yield event as ChatStreamEvent;
        }
        completed = true;
      } catch (error) {
        const providerError =
          error instanceof LLMProviderError
            ? error
            : new LLMProviderError(
                attempt.provider,
                attempt.model,
                classifyProviderError(error),
                attempt.userSuppliedKey,
              );
        lastError = providerError;
        if (providerError.userSuppliedKey && providerError.code === "auth")
          break;
        if (!providerError.userSuppliedKey) {
          rememberDead(attempt.provider, attempt.model, {
            code: providerError.code,
            status: providerError.status,
            message: providerError.message,
          });
        }
        if (emittedOutput) {
          yield {
            type: "error",
            data: providerError.message,
            code: providerError.code,
          };
          yield { type: "done" };
          return;
        }
        continue;
      }

      if (completed) {
        if (!result.toolCalls.length) {
          yield { type: "done" };
          return;
        }
        history.push({
          role: "assistant",
          content: result.text,
          toolCalls: result.toolCalls.map((call) => ({
            id: call.id,
            name: call.name,
            args: call.args,
          })),
        });
        for (const tool of result.toolCalls) {
          history.push({
            role: "tool",
            name: tool.name,
            toolCallId: tool.id,
            content: JSON.stringify(
              tool.error ? { error: tool.error } : tool.result,
            ),
          });
        }
        needsNextTurn = true;
        break;
      }
    }
    if (needsNextTurn) continue;
    if (lastError) {
      yield { type: "error", data: lastError.message, code: lastError.code };
    } else {
      yield {
        type: "error",
        data: "All AI providers are unavailable",
        code: "unavailable",
      };
    }
    yield { type: "done" };
    return;
  }
  yield {
    type: "error",
    data: "AI conversation exceeded the turn limit",
    code: "unavailable",
  };
  yield { type: "done" };
}
