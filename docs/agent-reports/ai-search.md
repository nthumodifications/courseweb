# AI course search

## Changed

- Added `POST /ai/search-intent` and mounted it under `/ai`. It validates the request, uses the shared `generateJSON` provider chain, caches by normalized query/semester/language in the existing D1 `cache` table, rate-limits uncached requests by IP, and returns `503 { code: "unavailable" }` when providers cannot answer.
- Added strict pure normalization for course levels, language, times, tags, GE values, credits, and department names/codes. Department values are resolved against distinct course departments from Supabase; invalid model values are dropped.
- Replaced the courses-page Sparkles `/chat` button with an accessible AI-search toggle. AI submit applies `query`, `refinementList`, and credit filters through InstantSearch state, so local search, Algolia, and Supabase fallback receive the same filters. The applied explanation is dismissible/undoable, and loading/error states plus a compact full-assistant link work on mobile.
- Added matching English/Traditional Chinese dictionary keys and API normalization tests.

## Verification

- `C:\Users\chewt\.bun\bin\bun.exe test src/ai/search-intent.test.ts src/ai/llm.test.ts src/ai/summarize.test.ts` — 14 passed, 0 failed.
- `node C:/Users/chewt/Repositories/courseweb/node_modules/typescript/bin/tsc --noEmit -p .` in `services/api` — passed with 0 errors.
- Same direct TypeScript command in `apps/web` after deleting `tsconfig.tsbuildinfo` — only the documented 9 baseline errors remain; no new error points at the AI search files.
- Both dictionaries parse as JSON; `git diff --check` passed.
- Applied the existing local D1 migrations with `bun run prisma:migration:apply:local` so the local cache table existed during smoke testing. The copied `services/api/.dev.vars` and Wrangler state are ignored/local only.

## Real Groq smoke outputs

I made five real calls using the local Groq key through the shared `generateJSON` chain and then ran the endpoint's `normalizeSearchIntent` logic. All used `groq / openai/gpt-oss-120b`.

```text
找週二下午、英文授課的資工系課程
=> query 資工; department [CS]; language [英]; separate_times [T5,T6,T7,T8,T9,Ta,Tb,Tc]
=> 使用者想找資工系在週二下午、以英文授課的課程。

想找三學分的資料科學或機器學習課程
=> query 資料科學 機器學習; department [CS]; credits [3]
=> 使用者想找學分為三學分、主題為資料科學或機器學習的課程，未指定課程等級、語言、時間或通識類別，預設搜尋資工系課程。

找核心通識第三向度、週四晚上可以上的課
=> query 核心通識 第三向度 週四晚上; ge_type [核心通識Core GE courses 3]
=> 使用者想找核心通識第三向度，且在週四晚上（R a/b/c）開課的課程。

English computer science courses on Tuesday afternoon
=> query computer science; department [CS]; language [英]; separate_times [T5,T6,T7,T8,T9]
=> The student wants English-taught computer science courses that are scheduled on Tuesday afternoons.

Find four-credit general education courses with no extra selection
=> query general education; tags [不可加簽]; credits [4]
=> The student wants general education courses that are four credits and cannot be added by extra selection (不可加簽).
```

The first local HTTP run was blocked by the uninitialized D1 database; after local migrations, Wrangler still reported its local Workers AI binding as unsupported and the local Worker request ended in the provider-chain `503`. The direct Bun calls above verified the real Groq path and normalization; a remote/production Worker smoke test remains for the manager’s deployment environment.

## Contract notes

- Credit filters are encoded as an OR expression (`credits = n OR ...`) in InstantSearch `configure.filters`; all other returned facets use the existing refinement-list state.
- The cache key includes `lang` as well as normalized query and semester so a Chinese explanation cannot be served for an otherwise identical English request.
- No commit, push, or GitHub operation was performed.
