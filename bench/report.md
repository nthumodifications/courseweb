# Courseweb client-side course-search benchmark

## Verdict

**YES for the primary search tier when the client loads/builds only the active-semester chunk. NO for one all-semesters index built eagerly on a mid-range phone.**

The active semester has 3,165 real rows. The measured FlexSearch design builds in **104.2 ms** in Chromium normally and **1,012.0 ms** at 4x CPU; its 13-facet browse-all p95 is **3.81 ms** normally and **53.12 ms** at 4x CPU. The active-semester UI projection is **185,964 bytes Brotli** (**58.7 bytes/course**) and the Node heap delta is **13.93 MB**. Those numbers are comfortably interactive.

The all-semester dataset has 57,214 rows. FlexSearch is fast after construction (Node warm mixed-query p95 **5.40 ms**), but the browser build is **2,447.1 ms** normally and **24,362.9 ms** at 4x CPU; 13-facet browse-all p95 is **125.81 ms** normally and **614.83 ms** at 4x CPU. It also uses **114.78 MB** measured Node heap delta. That is too much startup work for the default phone path. Load other semesters lazily.

This is a replacement of Algolia’s search function, not a claim that local search reproduces Algolia’s typo/synonym/ranking/analytics product features. For this catalog, Chinese names/teachers and exact course/department prefixes are the dominant contract; the benchmark proves those paths.

## Numbers first

### Dataset and payload

| Dataset | Rows | Source | JSON file bytes |
| --- | --- | --- | --- |
| 11510 | 3,165 | supabase-rest | 2,436,851 |
| all | 57,214 | supabase-rest | 42,192,557 |

Read-only integrity checks found no duplicate raw_id values in either dump. The all-semester dump contains 15 semesters; teacher_en is absent/null for 10,230 of 57,214 rows (teacher_zh is absent/null for 2), so Chinese teacher search is the reliable bilingual baseline and English teacher results are necessarily sparse for those rows.

Payloads are compact JSON.stringify arrays. Gzip uses Node’s default gzip settings. Brotli uses quality 5, a practical CDN setting; quality is part of the measurement. textSlim7 is the seven-field text-only projection and cannot by itself power facets. uiSearchProjection includes the result-row and facet/filter fields needed by the current UI.

| Dataset | Projection | Raw bytes | Raw KiB | Gzip bytes | Brotli bytes | Raw bytes/course |
| --- | --- | --- | --- | --- | --- | --- |
| 11510 | full | 2,436,851 | 2379.7 | 253,920 | 183,165 | 769.9 |
| 11510 | textSlim7 | 638,160 | 623.2 | 122,076 | 100,146 | 201.6 |
| 11510 | uiSearchProjection | 2,442,807 | 2385.6 | 261,587 | 185,964 | 771.8 |
| all | full | 42,192,557 | 41203.7 | 3,791,730 | 2,225,002 | 737.5 |
| all | textSlim7 | 10,967,793 | 10710.7 | 1,967,049 | 805,471 | 191.7 |
| all | uiSearchProjection | 42,276,669 | 41285.8 | 3,959,113 | 2,229,194 | 738.9 |

### JSON.parse and index build

Node v22.20.0; index-build and parse samples are n=100. Build p50/p95/max and query cold/warm p50/p95 are milliseconds. Cold query is the first query after each fresh build, with the 100 samples rotating through the query set. Warm query is n=100 per query, 1,100 samples in the overall aggregate. Memory is a separate n=3 post-GC heap-delta sample set.

| Dataset | Candidate | Build n | Build p50 | Build p95 | Build max | Cold p50 | Cold p95 | Warm p50 | Warm p95 | Heap delta MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 11510 | MiniSearch | 100 | 468.16 | 558.62 | 695.62 | 0.40 | 4.63 | 0.10 | 2.17 | 13.16 |
| 11510 | Orama | 100 | 179.58 | 241.95 | 268.79 | 1.67 | 50.70 | 1.35 | 44.78 | 18.54 |
| 11510 | FlexSearch | 100 | 133.76 | 169.74 | 202.98 | 0.07 | 0.11 | 0.02 | 0.08 | 13.93 |
| 11510 | Plain JS scan | 100 | 11.78 | 15.50 | 20.18 | 0.39 | 0.54 | 0.33 | 0.47 | 0.58 |
| all | MiniSearch | 100 | 7667.28 | 8640.66 | 10265.48 | 3.60 | 65.91 | 2.27 | 62.50 | 107.36 |
| all | Orama | 100 | 3121.98 | 3493.54 | 3713.69 | 26.81 | 707.64 | 24.77 | 712.06 | 192.16 |
| all | FlexSearch | 100 | 2749.26 | 5219.25 | 10320.84 | 0.55 | 3.98 | 0.29 | 5.40 | 114.78 |
| all | Plain JS scan | 100 | 368.43 | 653.57 | 848.02 | 8.17 | 13.04 | 10.47 | 20.97 | 9.62 |

| Dataset | Parsed projection | n | JSON.parse p50 | JSON.parse p95 | max |
| --- | --- | --- | --- | --- | --- |
| 11510 | full | 100 | 10.69 | 14.36 | 19.17 |
| 11510 | textSlim7 | 100 | 2.77 | 4.22 | 5.21 |
| 11510 | uiSearchProjection | 100 | 12.95 | 16.86 | 18.07 |
| all | full | 100 | 241.29 | 334.34 | 395.38 |
| all | textSlim7 | 100 | 61.79 | 81.98 | 129.61 |
| all | uiSearchProjection | 100 | 244.45 | 327.54 | 404.44 |

### Warm latency for every query

All values below are measured p50/p95 milliseconds, n=100 for each query. Result count is included to make broad-prefix and browse-all work visible.

| Dataset | Candidate | Query | p50 ms | p95 ms | Result count |
| --- | --- | --- | --- | --- | --- |
| 11510 | MiniSearch | empty browse-all | 0.13 | 0.30 | 3,165 |
| 11510 | MiniSearch | English prefix c | 2.22 | 4.07 | 2,077 |
| 11510 | MiniSearch | English prefix ca | 0.07 | 0.15 | 72 |
| 11510 | MiniSearch | English prefix cal | 0.02 | 0.04 | 22 |
| 11510 | MiniSearch | Chinese 微積分 | 0.19 | 0.31 | 20 |
| 11510 | MiniSearch | Chinese real name prefix | 0.10 | 0.11 | 1 |
| 11510 | MiniSearch | teacher zh | 0.18 | 0.28 | 2 |
| 11510 | MiniSearch | teacher en | 0.14 | 0.18 | 3 |
| 11510 | MiniSearch | course code 11510TSED702300 | 0.02 | 0.03 | 1 |
| 11510 | MiniSearch | department CS | 0.04 | 0.05 | 85 |
| 11510 | MiniSearch | real English name prefix | 0.02 | 0.02 | 25 |
| 11510 | Orama | empty browse-all | 0.06 | 0.11 | 3,165 |
| 11510 | Orama | English prefix c | 45.56 | 50.21 | 2,077 |
| 11510 | Orama | English prefix ca | 1.23 | 1.67 | 72 |
| 11510 | Orama | English prefix cal | 0.47 | 0.74 | 22 |
| 11510 | Orama | Chinese 微積分 | 2.69 | 3.47 | 20 |
| 11510 | Orama | Chinese real name prefix | 1.42 | 2.72 | 1 |
| 11510 | Orama | teacher zh | 3.84 | 4.55 | 2 |
| 11510 | Orama | teacher en | 11.73 | 14.46 | 3 |
| 11510 | Orama | course code 11510TSED702300 | 0.19 | 0.32 | 1 |
| 11510 | Orama | department CS | 1.39 | 1.92 | 85 |
| 11510 | Orama | real English name prefix | 0.53 | 0.77 | 25 |
| 11510 | FlexSearch | empty browse-all | 0.08 | 0.13 | 3,165 |
| 11510 | FlexSearch | English prefix c | 0.02 | 0.03 | 2,077 |
| 11510 | FlexSearch | English prefix ca | 0.00 | 0.00 | 72 |
| 11510 | FlexSearch | English prefix cal | 0.00 | 0.00 | 22 |
| 11510 | FlexSearch | Chinese 微積分 | 0.05 | 0.06 | 20 |
| 11510 | FlexSearch | Chinese real name prefix | 0.02 | 0.02 | 1 |
| 11510 | FlexSearch | teacher zh | 0.02 | 0.03 | 2 |
| 11510 | FlexSearch | teacher en | 0.03 | 0.04 | 3 |
| 11510 | FlexSearch | course code 11510TSED702300 | 0.00 | 0.00 | 1 |
| 11510 | FlexSearch | department CS | 0.00 | 0.00 | 85 |
| 11510 | FlexSearch | real English name prefix | 0.00 | 0.00 | 25 |
| 11510 | Plain JS scan | empty browse-all | 0.07 | 0.08 | 3,165 |
| 11510 | Plain JS scan | English prefix c | 0.18 | 0.24 | 2,783 |
| 11510 | Plain JS scan | English prefix ca | 0.34 | 0.45 | 596 |
| 11510 | Plain JS scan | English prefix cal | 0.38 | 0.45 | 325 |
| 11510 | Plain JS scan | Chinese 微積分 | 0.21 | 0.25 | 20 |
| 11510 | Plain JS scan | Chinese real name prefix | 0.21 | 0.27 | 1 |
| 11510 | Plain JS scan | teacher zh | 0.31 | 0.38 | 2 |
| 11510 | Plain JS scan | teacher en | 0.35 | 0.46 | 3 |
| 11510 | Plain JS scan | course code 11510TSED702300 | 0.38 | 0.51 | 1 |
| 11510 | Plain JS scan | department CS | 0.35 | 0.58 | 513 |
| 11510 | Plain JS scan | real English name prefix | 0.44 | 0.53 | 25 |
| all | MiniSearch | empty browse-all | 3.56 | 6.13 | 57,214 |
| all | MiniSearch | English prefix c | 63.55 | 76.77 | 30,992 |
| all | MiniSearch | English prefix ca | 0.89 | 2.48 | 1,239 |
| all | MiniSearch | English prefix cal | 0.30 | 0.61 | 523 |
| all | MiniSearch | Chinese 微積分 | 6.00 | 8.33 | 683 |
| all | MiniSearch | Chinese real name prefix | 12.68 | 21.05 | 225 |
| all | MiniSearch | teacher zh | 2.08 | 4.26 | 32 |
| all | MiniSearch | teacher en | 5.48 | 8.51 | 46 |
| all | MiniSearch | course code 11510TSED702300 | 0.01 | 0.01 | 1 |
| all | MiniSearch | department CS | 0.65 | 1.64 | 1,046 |
| all | MiniSearch | real English name prefix | 0.67 | 2.45 | 1,086 |
| all | Orama | empty browse-all | 1.70 | 4.37 | 57,214 |
| all | Orama | English prefix c | 717.89 | 996.19 | 30,992 |
| all | Orama | English prefix ca | 24.13 | 38.18 | 1,239 |
| all | Orama | English prefix cal | 12.28 | 19.18 | 523 |
| all | Orama | Chinese 微積分 | 72.54 | 99.30 | 683 |
| all | Orama | Chinese real name prefix | 120.14 | 147.79 | 225 |
| all | Orama | teacher zh | 52.35 | 72.01 | 32 |
| all | Orama | teacher en | 308.82 | 412.50 | 46 |
| all | Orama | course code 11510TSED702300 | 2.66 | 4.77 | 1 |
| all | Orama | department CS | 19.34 | 23.36 | 1,046 |
| all | Orama | real English name prefix | 19.17 | 25.74 | 1,086 |
| all | FlexSearch | empty browse-all | 2.85 | 6.47 | 57,214 |
| all | FlexSearch | English prefix c | 1.05 | 1.69 | 30,992 |
| all | FlexSearch | English prefix ca | 0.03 | 0.03 | 1,239 |
| all | FlexSearch | English prefix cal | 0.01 | 0.01 | 523 |
| all | FlexSearch | Chinese 微積分 | 2.14 | 3.10 | 683 |
| all | FlexSearch | Chinese real name prefix | 1.57 | 2.21 | 225 |
| all | FlexSearch | teacher zh | 0.29 | 0.49 | 32 |
| all | FlexSearch | teacher en | 5.22 | 6.89 | 46 |
| all | FlexSearch | course code 11510TSED702300 | 0.00 | 0.00 | 1 |
| all | FlexSearch | department CS | 0.02 | 0.02 | 1,046 |
| all | FlexSearch | real English name prefix | 0.02 | 0.02 | 1,086 |
| all | Plain JS scan | empty browse-all | 4.00 | 10.33 | 57,214 |
| all | Plain JS scan | English prefix c | 9.59 | 16.47 | 46,512 |
| all | Plain JS scan | English prefix ca | 11.49 | 19.44 | 9,186 |
| all | Plain JS scan | English prefix cal | 10.97 | 14.20 | 4,976 |
| all | Plain JS scan | Chinese 微積分 | 6.91 | 8.83 | 683 |
| all | Plain JS scan | Chinese real name prefix | 7.77 | 11.11 | 225 |
| all | Plain JS scan | teacher zh | 7.36 | 10.73 | 32 |
| all | Plain JS scan | teacher en | 11.87 | 190.61 | 32 |
| all | Plain JS scan | course code 11510TSED702300 | 13.12 | 24.68 | 1 |
| all | Plain JS scan | department CS | 12.23 | 60.32 | 8,833 |
| all | Plain JS scan | real English name prefix | 11.38 | 18.17 | 1,086 |

### Facets

The same local facet routine computes all 13 requested facets: courseLevel, cross_discipline, department, first_specialization, for_class, ge_target, ge_type, language, second_specialization, semester, separate_times, tags, venues. Each row below is n=100. browseAll is the full dataset for that dataset; chineseQuery is the actual 微積分 result set.

| Dataset | Case | Filtered rows | n | p50 ms | p95 ms | max ms | Facet maps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 11510 | browseAll | 3,165 | 100 | 3.86 | 8.54 | 30.06 | 13 |
| 11510 | chineseQuery | 20 | 100 | 0.09 | 0.16 | 1.27 | 13 |
| all | browseAll | 57,214 | 100 | 76.32 | 94.40 | 120.95 | 13 |
| all | chineseQuery | 683 | 100 | 0.93 | 1.44 | 2.08 | 13 |

The measured filter path also handles numeric and time filters. The benchmark used department:EE AND separate_times:M1 AND credits>=3; it returned 2 rows in 11510 and 19 rows across all semesters. FlexSearch’s combined c + filter warm p95 was 0.59 ms / 17.35 ms respectively.

### Bundle cost

| Candidate | Library | Minified bytes | Minified+gzip bytes |
| --- | --- | --- | --- |
| Plain JS scan | none | 0 | 0 |
| MiniSearch | MiniSearch | 17,654 | 5,883 |
| Orama | Orama | 65,332 | 22,373 |
| FlexSearch | FlexSearch | 15,873 | 6,506 |

Bundle measurements are esbuild browser bundles of the used library entry points. Plain JS has no dependency bundle; its application scan code is not assigned a synthetic library size.

## Correctness and search behavior

Every candidate’s final configuration passed the required checks: Chinese 微積分, a real Chinese name prefix, Chinese and English teacher names, 11510TSED702300, department CS, and English incremental prefixes c -> ca -> cal. The plain scan is the substring reference, so indexed candidates intentionally return fewer hits for prefix queries when the term occurs in the middle of a word.

| Dataset | Query | Plain reference | MiniSearch | Orama | FlexSearch | Plain JS |
| --- | --- | --- | --- | --- | --- | --- |
| 11510 | empty browse-all | 3,165 | 3,165 | 3,165 | 3,165 | 3,165 |
| 11510 | English prefix c | 2,783 | 2,077 | 2,077 | 2,077 | 2,783 |
| 11510 | English prefix ca | 596 | 72 | 72 | 72 | 596 |
| 11510 | English prefix cal | 325 | 22 | 22 | 22 | 325 |
| 11510 | Chinese 微積分 | 20 | 20 | 20 | 20 | 20 |
| 11510 | Chinese real name prefix | 1 | 1 | 1 | 1 | 1 |
| 11510 | teacher zh | 2 | 2 | 2 | 2 | 2 |
| 11510 | teacher en | 3 | 3 | 3 | 3 | 3 |
| 11510 | course code 11510TSED702300 | 1 | 1 | 1 | 1 | 1 |
| 11510 | department CS | 513 | 85 | 85 | 85 | 513 |
| 11510 | real English name prefix | 25 | 25 | 25 | 25 | 25 |
| all | empty browse-all | 57,214 | 57,214 | 57,214 | 57,214 | 57,214 |
| all | English prefix c | 46,512 | 30,992 | 30,992 | 30,992 | 46,512 |
| all | English prefix ca | 9,186 | 1,239 | 1,239 | 1,239 | 9,186 |
| all | English prefix cal | 4,976 | 523 | 523 | 523 | 4,976 |
| all | Chinese 微積分 | 683 | 683 | 683 | 683 | 683 |
| all | Chinese real name prefix | 225 | 225 | 225 | 225 | 225 |
| all | teacher zh | 32 | 32 | 32 | 32 | 32 |
| all | teacher en | 32 | 46 | 46 | 46 | 32 |
| all | course code 11510TSED702300 | 1 | 1 | 1 | 1 | 1 |
| all | department CS | 8,833 | 1,046 | 1,046 | 1,046 | 8,833 |
| all | real English name prefix | 1,086 | 1,086 | 1,086 | 1,086 | 1,086 |

Tokenizer used by MiniSearch and FlexSearch: lowercase alphanumeric runs plus CJK unigrams and adjacent bigrams. This avoids the whitespace-tokenizer CJK failure and makes multi-character Chinese phrases contiguous. Orama used the same tokenizer, but its Radix index does not retain phrase positions; its measured configuration therefore performs an explicit contiguous/prefix post-filter. That correctness repair is why Orama’s all-semester warm p95 is 712.06 ms and its filtered-query p95 is 1,044.37 ms, versus FlexSearch at 5.40 ms and 17.35 ms.

The benchmark indexes this searchable composite: name_zh, name_en, course, raw_id, department, teacher_zh[], and teacher_en[]. Course code and department prefix queries are therefore first-class paths, not special-case scans.

## Browser reality check

Runner: Playwright Chromium 153.0.8010.12 (Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.8010.12 Safari/537.36), headless, Vite dev server at 127.0.0.1:4173, fresh page per dataset/throttle case. The CDP command Emulation.setCPUThrottlingRate({ rate: 4 }) supplied the 4x CPU cases. Browser query/facet samples are n=100 per query/case. Browser JSON.parse p50/p95 is n=100; build and projection are one fresh build measurement per case.

| CPU | Dataset | Rows | Fetch ms | Parse p50 | Parse p95 | Projection ms | Build ms | Query p50 | Query p95 | Facet p50 | Facet p95 | 微積分 hits | CJK | Code hits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal CPU | 11510 | 3,165 | 27.60 | 4.25 | 6.41 | 8.10 | 104.20 | 0.00 | 0.10 | 2.80 | 3.81 | 20 | pass | 1 |
| normal CPU | all | 57,214 | 209.00 | 126.55 | 178.19 | 122.00 | 2447.10 | 0.10 | 2.10 | 84.25 | 125.81 | 683 | pass | 1 |
| 4x CPU | 11510 | 3,165 | 88.50 | 20.20 | 29.93 | 24.90 | 1012.00 | 0.00 | 0.40 | 29.50 | 53.11 | 20 | pass | 1 |
| 4x CPU | all | 57,214 | 1199.20 | 663.35 | 864.56 | 672.40 | 24362.90 | 1.20 | 19.30 | 332.15 | 614.83 | 683 | pass | 1 |

The Vite browser server served raw JSON, so browser fetchMs is a local uncompressed-file timing, not a CDN network estimate. Network payload sizes are the Node raw/gzip/Brotli table above.

Chromium exposed performance.memory, but its values were privacy-quantized (for example, all-semester before and after both reported 212,000,000 bytes), so browser heap delta is inconclusive, not zero. performance.measureUserAgentSpecificMemory() was unavailable in this page. Node’s --expose-gc heap deltas are the usable memory measurements in this report.

## What the UI actually needs

The inspected result list (apps/web/src/components/Courses/CourseListItem.tsx, CourseTagsList.tsx, and the planner equivalent) renders: raw_id, semester/department/course/class identity, bilingual names, bilingual teacher arrays, credits, venues, times, language, capacity, enrolled, reserve, closed mark, tags, GE target/type, the specialization/cross-discipline/class arrays used by filters, restrictions, note, prerequisites, and objectID. Search also needs the derived courseLevel, separate_times, and for_class values.

The course detail route is separate (apps/web/src/components/CourseDetails/CourseDetailsContainer.tsx): syllabus brief/content/keywords, course dates, scores, and other detail joins should remain remote and fetched by raw_id. The source courses table has no brief column; the current fallback spreads the course row and does not synthesize it. The practical search projection therefore does not pretend to carry detail content.

## Migration sketch

1. Publish one compressed JSON chunk per semester from a trusted server/CDN. Include a manifest with semester, row count, max(updated_at), and a content hash; cache in IndexedDB under a key containing the semester and manifest version/hash. A max timestamp alone does not detect deletes.
2. On the course page, select the refined semester, load only that chunk, prepare the derived fields, and build one FlexSearch Index with tokenize: forward, minlength: 1, and the CJK unigram+bigrams encoder. Keep the UI result projection in the chunk; do not ship syllabus/detail joins. Build on-device for the measured 3k-row case.
3. Add a local InstantSearch-compatible client in front of the existing apps/web/src/lib/search-client.ts Algolia primary -> backup -> Supabase fallback chain. search(requests) must parse query, page, hitsPerPage, facetFilters, numericFilters, filters, facets, maxValuesPerFacet, and attributesToRetrieve; retrieve FlexSearch IDs; apply AND-of-OR facet groups plus numeric credits operators and separate_times; compute nbHits, nbPages, the requested 13 facet maps, and the page of hits.
4. Implement searchForFacetValues(requests) locally by applying the other refinements, counting the requested facet over the remaining records, filtering facet values by the facet query prefix/substring contract, and returning facetHits with value, highlighted, and count.
5. Slot the local client ahead of the current apps/web/src/lib/search-client.ts Algolia primary -> backup -> Supabase fallback chain. If the active-semester chunk is unavailable or stale, delegate to the current remote client; retain the current remote tier for cross-semester search, cache misses, manifest errors, and detail data. The existing InstantSearch components can remain if the adapter preserves the Algolia response shape and objectID.
6. Add a local index ready/loading status and avoid firing remote search while a valid local chunk is building. Keep analytics events, but distinguish backend=local from remote search in the event payload.

Recommended strategy: FlexSearch + CJK unigram/bigram tokenizer + the measured uiSearchProjection per-semester JSON chunk + IndexedDB manifest-version cache + on-device build. Prebuilt serialized-index shipping from object storage was not measured here; it could reduce build time but introduces a versioned binary format and larger compatibility surface, so it should be a follow-up experiment rather than an assumed benefit.

## What local search loses versus Algolia

- Typo tolerance and typo-aware ranking. The measured design uses exact token/prefix matching; a misspelled Chinese character or English term will not receive Algolia-style correction.
- Synonyms, language-specific relevance tuning, typo dictionaries, merchandising, and mature field-level ranking. FlexSearch’s flat composite index needs an explicit local ranking layer if result ordering matters beyond prefix matching.
- Hosted analytics and operational controls: search analytics, click/conversion signals, dashboard tuning, remote index changes, and centrally managed query rules. Local search must emit its own events and ship new chunks/manifests.
- Instant global freshness. A cached semester chunk can be stale until its manifest is checked; remote fallback remains necessary for cache misses and update failures.

These losses matter less for exact NTHU course names, Chinese teacher names, course codes, department prefixes, and faceted browsing than they would for open-ended ecommerce search. They still matter enough to keep remote fallback and to validate ranking and typo behavior with real user analytics before deleting Algolia permanently.

## Reproduction

From bench/ (the repository root was not installed or modified):

    npm install --no-audit --no-fund
    node fetch-data.mjs
    $env:LOCAL_SEARCH_BENCH_RUNS='100'; $env:LOCAL_SEARCH_MEMORY_RUNS='3'; node --expose-gc benchmark.mjs
    npx vite --host 127.0.0.1 --port 4173
    node run-browser.mjs
    node report.mjs -o report.md

Data was fetched directly from Supabase REST using the local main-checkout apps/web/.env credentials (the dedicated worktree has no ignored app .env), with 1,000-row pages. Exact counts: 3,165 for semester=11510, 57,214 for all semesters. Data and machine-readable results are in bench/data/, bench/results.json, and bench/browser-results.json.

Benchmark date: 2026-09-12T16:46:20.872Z through 2026-09-12T17:19:53.462Z.