# AI web agent report

## Changed

- Reworked `useAIChat` around the chat SSE contract. It now buffers split SSE lines and UTF-8 chunks, flushes the final frame, handles `[DONE]`, stores provider/model metadata, tracks generic tool calls/results, distinguishes coded provider failures, treats HTTP 401 as a sign-in prompt, handles abort/network failures, and retries the last prompt without duplicating it. Existing localStorage history remains enabled.
- Added the pure `SSEParser` helper and Bun tests covering split frames, CRLF, `[DONE]`, final-frame flushing, comments, and malformed frames.
- Added bilingual chat error/retry UI, provider/model labels, generic collapsible tool details, course-ID linkification to the localized course route, and six empty-state prompts covering course search, free periods, conflicts, graduation requirements, buses, and the academic calendar.
- Changed AI settings key testing to `POST /ai/test-key`, with distinct valid/auth/quota/unavailable/network states. Added Google AI Studio/free-tier guidance and derived entrance years from the current ROC year (currently 115 in 2026).
- Updated syllabus summaries to forward a saved custom key through `X-Gemini-Api-Key`, provide explicit 429/503 retry messages, recognize both English and Traditional Chinese workload values, and clamp difficulty ratings to 0–5.

## Verification run

- `C:\Users\chewt\.bun\bin\bun.exe test src/hooks/sseParser.test.ts` — 3 passed, 0 failed.
- `node C:/Users/chewt/Repositories/courseweb/node_modules/typescript/bin/tsc --noEmit -p .` from `apps/web` — no changed-file diagnostics; the output is the expected nine baseline diagnostics in `GenericIssueFormDialog.tsx`, `IssueFormDialog.tsx`, `useDining.ts`, `flexsearch-index.ts`, and `worker.ts`.
- JSON parse/key-tree comparison for `en.json` and `zh.json` — both parsed successfully, 1,653 leaf keys each, no missing keys in either direction.
- `git diff --check` — passed.
- `node ../../node_modules/vite/bin/vite.js build` from `apps/web` — transformed 6,612 modules, then failed in the existing local-search path because Rollup cannot resolve the pre-existing `flexsearch` dependency. No AI-file error was reported.

## Left undone / handoff

- No browser check was run; manager should verify signed-in chat streaming, provider fallback labels, retry/auth states, settings key testing, and syllabus retry behavior after the API work is merged.
- The Vite build remains blocked by the worktree’s missing/unresolved `flexsearch` install; dependencies were not installed because the worktree shares junctioned `node_modules` with the main checkout.
- No service/API files were changed. The web client expects the manager’s API implementation to emit the documented SSE `meta`, `text`, `tool_call`, `tool_result`, `error`, and `done` events and to expose `/ai/test-key` plus the syllabus status codes.

