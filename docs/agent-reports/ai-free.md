# AI free-provider chain

## Changed

- Generalized the Groq implementation into an OpenAI-compatible provider table in `services/api/src/ai/llm.ts`.
  Each entry owns its base URL, secret name, model-list variable, defaults, JSON-mode capability, tool capability, and optional headers.
- Added keyed providers in the requested order: Groq, Cerebras, OpenRouter free models, Mistral, and a legacy GitHub Models slot, with Workers AI remaining the keyless floor.
- Added `AI_PROVIDER_ORDER`; user-supplied Gemini keys remain first, and omitted providers are appended in the standard order.
- Shared JSON generation and streamed tool handling across all OpenAI-compatible providers. Providers without JSON mode receive strict JSON instructions and still pass the existing schema validation.
- Classified 402/429 as quota and 5xx/404 as unavailable for fallback. Daily-limit 429s and OpenRouter free-model credit exhaustion are dead-cached for 24 hours; other temporary failures retain the shorter cache windows.
- Extended `/ai/status`, Worker `Bindings`, Wrangler comments, and added `services/api/.dev.vars.example` for optional provider secrets.
- Added table-driven fallback tests plus OpenRouter-header and strict-JSON capability tests.

## Documentation verification

Checked the official/current provider documentation on 2026-09-29:

- Cerebras: `https://inference-docs.cerebras.ai/api-reference/chat-completions`, `https://inference-docs.cerebras.ai/capabilities/tool-use`, and `https://inference-docs.cerebras.ai/capabilities/structured-outputs` confirm `https://api.cerebras.ai/v1`, Bearer auth, tool calling, JSON mode, and current public models including `gpt-oss-120b` and `qwen-3.8-27b`.
- OpenRouter: `https://openrouter.ai/docs/quickstart` and the official `https://openrouter.ai/api/v1/models` catalog confirm `https://openrouter.ai/api/v1`, Bearer auth, tool calling, and current `:free` model IDs. Defaults use JSON-capable tool models; the OpenRouter free router is deliberately not used because it is not a `:free` model slug. Requests include `HTTP-Referer: https://nthumods.com` and `X-Title: NTHUMods`.
- Mistral: `https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key` and `https://docs.mistral.ai/resources/known-limitations` confirm `https://api.mistral.ai/v1`, Bearer auth, free mode with limits, function calling, and JSON mode. Defaults use `mistral-small-latest` and `ministral-8b-latest`.
- GitHub: the official `https://github.com/github/docs/blob/main/content/github-models/index.md` says GitHub Models was fully retired on 2026-07-30, including its inference API. No current free model ID could therefore be verified. The requested provider name, token, endpoint, and legacy model IDs remain as a fail-closed compatibility slot: if configured, it receives the request, caches the expected 404, and falls through to Workers AI. It is not represented as a currently working free service.

## Verification run

- `C:/Users/chewt/.bun/bin/bun test src/ai/llm.test.ts` — **15 passed, 0 failed**.
- `node C:/Users/chewt/Repositories/courseweb/node_modules/typescript/bin/tsc --noEmit -p .` from `services/api` — **0 errors**.
- `git diff --check` — **passed**.
- `C:/Users/chewt/.bun/bin/bun test src` — **143 passed, 0 failed; 384 expectations**. Existing tests print expected simulated upstream/auth errors while passing.
- Required live Groq check through `generateJSON`, using the quoted `GROQ_API_KEY` from the main checkout's untracked `services/api/.dev.vars` after removing dotenv quotes (the secret was never printed):

  ```json
  {"data":{"ok":true,"provider":"Groq"},"provider":"groq","model":"openai/gpt-oss-120b"}
  ```

## Left undone / handoff

- GitHub Models cannot be made a current working free fallback because the provider itself is retired. Remove the compatibility slot later if the manager prefers not to keep the expected 404 fallback.
- No new provider keys were available locally, so Cerebras, OpenRouter, and Mistral were verified with mocked fetches only. Groq was the only real provider call.
- No commit, push, deployment, or `gh` command was run.
