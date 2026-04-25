# Comprehensive SEO Overhaul Design

**Date:** 2026-04-25
**Status:** Approved
**Goal:** Restore and enhance SEO capabilities after Cloudflare Pages migration, focusing on course pages, department listings, bus routes, and static pages with comprehensive structured data and dynamic sitemap generation.

---

## Problem Statement

After migrating to Cloudflare Pages and fixing SPA routing issues, the worker.ts file was stripped down to a minimal passthrough. This broke previously working SEO features:

- **Lost:** Bot detection and meta tag injection for course pages
- **Lost:** Course-specific Open Graph tags for social media link previews
- **Missing:** SEO optimization for department pages, bus routes, and timetable
- **Missing:** Structured data (JSON-LD) for rich search results
- **Missing:** Dynamic sitemap with course-specific URLs

This results in poor social media link previews and suboptimal search engine indexing.

---

## Success Criteria

1. **Social Media Link Previews:** Sharing course links on LINE, WhatsApp, Facebook, Twitter shows course-specific titles and descriptions
2. **Search Engine Indexing:** Google indexes course pages with proper titles and descriptions
3. **Rich Search Results:** Google displays enhanced results with breadcrumbs, structured course data
4. **Fresh Sitemap:** Sitemap automatically includes courses from last 2 semesters, refreshed every 24 hours
5. **Zero Regression:** Regular users experience no performance degradation
6. **Reliable Fallback:** If worker fails, React Helmet provides meta tags as safety net

---

## Architecture Overview

### Three-Layer Approach

**1. Edge Layer (Cloudflare Worker)**

- Detects bots via User-Agent matching
- Intercepts requests to dynamic pages: courses, departments, bus routes
- Fetches minimal data from API with aggressive edge caching
- Uses HTMLRewriter to inject meta tags before response leaves edge
- Generates sitemap.xml on-demand with edge caching
- Falls through to ASSETS for non-bot traffic (zero overhead)

**2. React Layer (Helmet Components)**

- Provides SEO meta tags for regular users
- Updates `<head>` on client-side route changes
- Includes comprehensive JSON-LD structured data
- Acts as fallback if worker fails (especially for JS-executing bots like Googlebot)

**3. Sitemap Layer (Worker-Generated)**

- Runtime generation via Worker endpoint at `/sitemap.xml`
- Queries API for courses from last 2 semesters
- Generates XML with static pages + dynamic course/department/bus URLs
- Caches result at edge for 24 hours
- Always up-to-date without requiring redeployments

---

## Data Flow

### Bot Request Flow

```
Bot request → Worker detects bot UA
  → Pattern match URL (course/department/bus)
  → Fetch from API (with 24hr edge cache)
  → HTMLRewriter injects meta tags
  → Modified HTML → Bot receives optimized tags
```

### User Request Flow

```
User request → Worker detects non-bot UA
  → Pass through to ASSETS (zero overhead)
  → Static HTML → React loads
  → Helmet updates <head> on route change
```

### Sitemap Request Flow

```
GET /sitemap.xml → Worker intercepts
  → Check edge cache (24hr TTL)
  → If cached: return immediately
  → If not: Query API for recent courses
  → Generate XML with hreflang alternates
  → Cache at edge → Return XML
```

---

## Worker Implementation Details

### Bot Detection

**Supported User-Agents:**

- Search engines: Googlebot, Bingbot, DuckDuckBot, Baiduspider, Yandexbot, Applebot
- Social crawlers: facebookexternalhit, twitterbot, linkedinbot, whatsapp, telegrambot, discordbot, line-poker, kakaotalk
- Other: embedly, pinterest, slackbot, w3c_validator

**Detection method:**

```typescript
const BOT_UA_FRAGMENTS = ["googlebot", "bingbot", "facebookexternalhit", ...];
function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_FRAGMENTS.some(f => ua.includes(f));
}
```

### Page Type Handlers

#### 1. Course Detail Pages: `/:lang/courses/:courseId`

**API Call:**

- Endpoint: `https://api.nthumods.com/course/:courseId`
- Cache TTL: **24 hours** at edge
- Fields needed: `name_zh`, `name_en`, `teacher_zh`, `teacher_en`, `semester`, `department`, `course_syllabus.brief`

**Meta Tags Injected:**

- `<title>`: `{name_zh} {teachers} - {semester} 清大{department}課程 | NTHUMods`
- `<meta name="description">`: `清大 {semester} {name_zh}（{name_en}），{teachers} 授課。查看課程大綱、評分記錄與歷年開課資訊。`
- `<meta property="og:title">`: `{name_zh} - {department} | NTHUMods`
- `<meta property="og:description">`: `清大 {name_zh}（{name_en}），{teachers} 授課，{semester} 學期。查看課程大綱與歷年資訊。`
- `<meta property="og:url">`: `https://nthumods.com/{lang}/courses/{courseId}`
- `<meta property="og:type">`: `article`
- `<meta name="twitter:card">`: `summary`
- `<meta name="twitter:title">`: Same as og:title
- `<meta name="twitter:description">`: Same as og:description
- `<link rel="canonical">`: `https://nthumods.com/zh/courses/{courseId}` (always zh)

#### 2. Department Listing Pages: `/:lang/courses?department=XXX`

**URL Pattern:** Extract department from query string

**API Call:**

- Endpoint: `https://api.nthumods.com/courses?department={dept}&semester={current}&limit=500`
- Cache TTL: **24 hours**
- Get course count and sample courses for description

**Meta Tags Injected:**

- `<title>`: `清華大學{department}課程列表 - {courseCount}門課程 | NTHUMods`
- `<meta name="description">`: `瀏覽清華大學{department}所有課程，包含 {sampleCourseNames}...等 {courseCount} 門課程。`
- `<meta property="og:type">`: `website`
- `<meta property="og:url">`: `https://nthumods.com/{lang}/courses?department={dept}`

#### 3. Bus Route Pages: `/:lang/bus/:route` and `/:lang/bus/:route/:line`

**API Call:**

- Endpoint: `https://api.nthumods.com/bus/:route`
- Cache TTL: **7 days** (bus routes change infrequently)
- Fields needed: route name, stops, schedule info

**Meta Tags Injected:**

- `<title>`: `清華大學校車 {routeName} - 即時時刻表與路線資訊 | NTHUMods`
- `<meta name="description">`: `查看清華大學校車{routeName}即時時刻表、路線圖與站點資訊。`
- `<meta property="og:type">`: `website`

#### 4. Sitemap Generation: `/sitemap.xml`

**API Call:**

- Endpoint: `https://api.nthumods.com/courses?semesters={last2semesters}`
- Cache TTL: **24 hours**
- Get all courses from last 2 semesters (e.g., 113-2 and 113-1)
  - **Definition of "last 2 semesters":** Query the API for the 2 most recent semester values present in the database. This ensures the sitemap always includes currently relevant courses without hardcoding semester values.

**Sitemap Content:**

**Static Pages:**

- Homepage: `/zh/`, `/en/`
- Courses: `/zh/courses`, `/en/courses`
- Timetable: `/zh/timetable`, `/en/timetable`
- Bus: `/zh/bus`, `/en/bus`
- Calendar/Today: `/zh/today`, `/en/today`
- Venues: `/zh/venues`, `/en/venues`
- Static pages: `/zh/team`, `/en/team`, `/zh/contribute`, `/en/contribute`

**Dynamic Pages:**

- Course detail pages: `/zh/courses/{courseId}` (all courses from last 2 semesters)
- Department pages: `/zh/courses?department={dept}` (major departments only)
- Bus routes: `/zh/bus/{route}` (all active routes)

**XML Format:**

```xml
<url>
  <loc>https://nthumods.com/zh/courses/{courseId}</loc>
  <lastmod>2026-04-25</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.80</priority>
  <xhtml:link rel="alternate" hreflang="zh-TW" href="https://nthumods.com/zh/courses/{courseId}"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://nthumods.com/en/courses/{courseId}"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://nthumods.com/zh/courses/{courseId}"/>
</url>
```

**Priority Values:**

- Homepage: 1.00
- Main pages (courses, timetable, bus): 1.00
- Course detail pages: 0.80
- Department pages: 0.70
- Bus routes: 0.60
- Static pages: 0.50

### Worker Code Structure

```typescript
interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle sitemap request
    if (url.pathname === "/sitemap.xml") {
      return generateSitemap(env);
    }

    // 2. Fast path: non-bots go straight to ASSETS
    const userAgent = request.headers.get("User-Agent") ?? "";
    if (!isBot(userAgent)) {
      return env.ASSETS.fetch(request);
    }

    // 3. Match URL patterns and handle accordingly
    const courseMatch = url.pathname.match(/^\/(zh|en)\/courses\/(.+)$/);
    if (courseMatch) {
      return handleCourseDetailPage(courseMatch[1], courseMatch[2], env);
    }

    const deptMatch =
      url.pathname.match(/^\/(zh|en)\/courses$/) &&
      url.searchParams.has("department");
    if (deptMatch) {
      return handleDepartmentPage(url, env);
    }

    const busMatch = url.pathname.match(/^\/(zh|en)\/bus\/(.+)$/);
    if (busMatch) {
      return handleBusPage(busMatch[1], busMatch[2], env);
    }

    // 4. All other pages: serve normally
    return env.ASSETS.fetch(request);
  },
};
```

### Helper Functions

**`handleCourseDetailPage(lang, courseId, env)`:**

- Fetch course data from API with 24hr edge cache
- Generate title, description, og tags
- Use HTMLRewriter to inject tags
- Return modified response or fallback to ASSETS on error

**`handleDepartmentPage(url, env)`:**

- Extract department from query params
- Fetch courses for department with 24hr cache
- Generate meta tags with course count
- Inject via HTMLRewriter

**`handleBusPage(lang, route, env)`:**

- Fetch bus route data with 7-day cache
- Generate route-specific meta tags
- Inject via HTMLRewriter

**`generateSitemap(env)`:**

- Check Cloudflare cache for existing sitemap (24hr TTL)
- If cached, return immediately
- If not: fetch recent courses from API
- Build XML string with static + dynamic pages
- Store in cache and return

**`injectMetaTags(response, metaData)`:**

- Use HTMLRewriter with selectors for title, meta tags, canonical
- Replace content/attributes with course-specific data
- Return transformed response

---

## React Layer Enhancements

### New Structured Data Hooks

**`useBreadcrumbJsonLd(items: BreadcrumbItem[])`:**

```typescript
interface BreadcrumbItem {
  name: string;
  url: string;
}

// Returns BreadcrumbList JSON-LD
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "首頁", "item": "..." },
    { "@type": "ListItem", "position": 2, "name": "課程", "item": "..." },
    ...
  ]
}
```

**`useWebPageJsonLd(pageData)`:**

```typescript
// Returns WebPage JSON-LD
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": pageData.title,
  "description": pageData.description,
  "url": pageData.url,
  "inLanguage": "zh-TW",
  "isPartOf": { "@type": "WebSite", "url": "https://nthumods.com" }
}
```

**`useStructuredData(type, data)`:**

- Generic hook for creating any JSON-LD type
- Validates data structure
- Returns formatted JSON-LD object or null on error

### Enhanced SEO Components

#### CourseDetailsContainer.tsx

**Additions:**

- BreadcrumbList JSON-LD: `Home → Courses → {Department} → {CourseName}`
- WebPage JSON-LD with course metadata
- Keep existing Course JSON-LD

**Implementation:**

```tsx
const breadcrumbs = useBreadcrumbJsonLd([
  { name: dict.header.home, url: `https://nthumods.com/${lang}` },
  { name: dict.header.courses, url: `https://nthumods.com/${lang}/courses` },
  {
    name: course.department,
    url: `https://nthumods.com/${lang}/courses?department=${course.department}`,
  },
  {
    name: course.name_zh,
    url: `https://nthumods.com/${lang}/courses/${course.raw_id}`,
  },
]);

// Add to existing Helmet block
<script type="application/ld+json">
  {JSON.stringify([courseJsonLd, breadcrumbs, webPageJsonLd])}
</script>;
```

#### Department Listing Page

**Create SEOHead usage when department filter is active:**

**Detection:**

- Check if `?department=X` query param exists
- Extract department name from query or course list

**SEO Implementation:**

```tsx
const { department, courses } = useDepartmentCourses();

const breadcrumbs = useBreadcrumbJsonLd([
  { name: "首頁", url: `https://nthumods.com/${lang}` },
  { name: "課程", url: `https://nthumods.com/${lang}/courses` },
  {
    name: department,
    url: `https://nthumods.com/${lang}/courses?department=${department}`,
  },
]);

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: courses.slice(0, 10).map((course, index) => ({
    "@type": "Course",
    position: index + 1,
    name: course.name_zh,
    url: `https://nthumods.com/zh/courses/${course.raw_id}`,
  })),
};

<SEOHead
  title={`${department}課程列表`}
  description={`瀏覽清華大學${department}所有課程，共 ${courses.length} 門課程`}
  canonical={`https://nthumods.com/${lang}/courses?department=${department}`}
  jsonLd={[breadcrumbs, itemListJsonLd, webPageJsonLd]}
/>;
```

#### Timetable Page

**Add WebApplication structured data:**

```tsx
const timetableJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "NTHUMods 課表系統",
  url: "https://nthumods.com/zh/timetable",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TWD",
  },
};

<SEOHead
  title="課表管理"
  description="智慧排課系統，輕鬆管理清華大學課程時間表，支援匯出、分享、同步行事曆功能。"
  canonical={`https://nthumods.com/${lang}/timetable`}
  jsonLd={[timetableJsonLd, webPageJsonLd]}
/>;
```

#### Bus Pages

**Main bus page `/bus`:**

```tsx
<SEOHead
  title="校車時刻表"
  description="查看清華大學校車即時時刻表，包含校園巴士、南大區間車等路線資訊。"
  canonical={`https://nthumods.com/${lang}/bus`}
  jsonLd={webPageJsonLd}
/>
```

**Bus route detail page `/bus/:route`:**

```tsx
const breadcrumbs = useBreadcrumbJsonLd([
  { name: "首頁", url: `https://nthumods.com/${lang}` },
  { name: "校車", url: `https://nthumods.com/${lang}/bus` },
  { name: routeName, url: `https://nthumods.com/${lang}/bus/${route}` },
]);

// Optional: TransitRoute JSON-LD if data structure permits
const transitRouteJsonLd = {
  "@context": "https://schema.org",
  "@type": "BusRoute",
  name: routeName,
  provider: {
    "@type": "EducationalOrganization",
    name: "National Tsing Hua University",
  },
};

<SEOHead
  title={`${routeName} - 校車時刻表`}
  description={`查看清華大學校車${routeName}即時時刻表、路線圖與站點資訊。`}
  canonical={`https://nthumods.com/${lang}/bus/${route}`}
  jsonLd={[breadcrumbs, transitRouteJsonLd, webPageJsonLd]}
/>;
```

#### Static Pages Enhancement

**Update TitleUpdater.tsx to include WebPage JSON-LD for all routes:**

```tsx
const webPageJsonLd = useWebPageJsonLd({
  title: routeHandle?.title || "NTHUMods",
  description: routeHandle?.description || defaultDescription,
  url: `https://nthumods.com${location.pathname}`,
});

// Add to Helmet
<script type="application/ld+json">{JSON.stringify(webPageJsonLd)}</script>;
```

---

## Cache Strategy

**Edge Caching (Cloudflare):**

- Course data: **24 hours** (courses don't change frequently)
- Department data: **24 hours**
- Bus routes: **7 days** (routes rarely change)
- Sitemap: **24 hours** (balance freshness vs API load)

**Cache Headers:**

```typescript
{
  cf: {
    cacheTtl: 86400, // 24 hours in seconds
    cacheEverything: true
  }
}
```

**Cache Keys:**

- Course: `api.nthumods.com/course/{courseId}`
- Department: `api.nthumods.com/courses?department={dept}&semester={sem}`
- Bus: `api.nthumods.com/bus/{route}`
- Sitemap: Custom cache key `sitemap-xml-v1`

**Why aggressive caching works:**

- Course data is stable (changes are rare mid-semester)
- 24-hour freshness is acceptable for SEO purposes
- Reduces API load significantly
- Users still get real-time data (they bypass cache)

---

## Error Handling & Graceful Degradation

### Worker Failure Modes

**Every code path has a fallback:**

```typescript
try {
  // Attempt API fetch + HTMLRewriter
  const apiRes = await fetch(apiUrl, { cf: { cacheTtl: 86400 } });
  if (!apiRes.ok) throw new Error("API error");
  const data = await apiRes.json();
  if (!data?.name_zh) throw new Error("Invalid data");

  // Transform and return
  return (
    new HTMLRewriter()
      .on("title", {
        element(el) {
          el.setInnerContent(title);
        },
      })
      // ... more transformations
      .transform(spaResponse)
  );
} catch (error) {
  // ALWAYS fall back to static HTML
  return env.ASSETS.fetch(request);
}
```

**Specific error scenarios:**

1. **API timeout/unavailable:**

   - Worker catches fetch errors
   - Returns static HTML
   - React Helmet provides meta tags as fallback

2. **Invalid course/department ID:**

   - API returns 404 or invalid data
   - Worker detects and falls back to static HTML
   - React router handles 404 display

3. **Malformed API response:**

   - JSON parsing fails
   - Data validation fails (missing required fields)
   - Falls back to static HTML

4. **HTMLRewriter transformation fails:**

   - Catches any transformation errors
   - Returns original response unmodified

5. **Cloudflare cache unavailable:**
   - Worker still makes API request (just slower)
   - No user-facing impact

### React Layer Resilience

**Helmet as safety net:**

- If worker fails to inject meta tags, React Helmet fills them in after page loads
- Googlebot (executes JavaScript) will still see the meta tags
- Regular users always get proper meta tags via Helmet

**Structured Data Validation:**

```tsx
const generateJsonLd = (data) => {
  try {
    if (!data.required_field) return null;
    return {
      "@context": "https://schema.org",
      // ... valid structure
    };
  } catch (error) {
    console.error("JSON-LD generation failed:", error);
    return null;
  }
};

// In component
{
  jsonLdData && (
    <script type="application/ld+json">{JSON.stringify(jsonLdData)}</script>
  );
}
```

### Sitemap Resilience

**If sitemap generation fails:**

```typescript
async function generateSitemap(env: Env): Promise<Response> {
  try {
    // Check cache first
    const cached = await getCachedSitemap();
    if (cached) return cached;

    // Generate fresh sitemap
    const courses = await fetchRecentCourses();
    const xml = buildSitemapXML(courses);
    await cacheSitemap(xml);
    return new Response(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    // Return minimal static sitemap instead of error
    return new Response(FALLBACK_STATIC_SITEMAP, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

const FALLBACK_STATIC_SITEMAP = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://nthumods.com/zh/</loc></url>
  <url><loc>https://nthumods.com/zh/courses</loc></url>
  <url><loc>https://nthumods.com/zh/timetable</loc></url>
</urlset>`;
```

**Never return 500 error for sitemap - always return valid XML**

---

## Testing Strategy

### 1. Worker Testing

**Local Development:**

```bash
# Start local worker
cd apps/web
wrangler dev

# Test with bot User-Agents
curl -A "Googlebot/2.1" http://localhost:8788/zh/courses/CS_1110
curl -A "facebookexternalhit/1.1" http://localhost:8788/zh/courses?department=電機工程學系
curl -A "LINE-poker/1.0" http://localhost:8788/zh/bus/main-campus

# Test sitemap
curl http://localhost:8788/sitemap.xml

# Verify edge caching
curl -I http://localhost:8788/zh/courses/CS_1110 # Check cf-cache-status header
```

**Validation Checklist:**

- [ ] Bot User-Agent detection works correctly
- [ ] Non-bot requests pass through to ASSETS with zero overhead
- [ ] HTMLRewriter injects all required meta tags
- [ ] API errors fall back gracefully to static HTML
- [ ] Sitemap generates valid XML
- [ ] Cache headers are set correctly

**Preview Deployment Testing:**

```bash
# Deploy to preview environment
git push

# Test with real preview URL
curl -A "Googlebot/2.1" https://preview-branch.pages.dev/zh/courses/CS_1110

# Use browser dev tools to spoof User-Agent
# Chrome DevTools → Network conditions → User agent → Custom
```

### 2. Meta Tag Validation

**Tools to use:**

- **Google Rich Results Test:** https://search.google.com/test/rich-results
- **Facebook Sharing Debugger:** https://developers.facebook.com/tools/debug/
- **Twitter Card Validator:** https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector:** https://www.linkedin.com/post-inspector/
- **OpenGraph.xyz:** https://www.opengraph.xyz/

**Test Cases:**

- [ ] Course page shows course name + teacher in preview
- [ ] Department page shows department name + course count
- [ ] Bus page shows route name and description
- [ ] Images load correctly in social previews
- [ ] Canonical URLs point to zh version (language preference)

### 3. Structured Data Validation

**Tools:**

- **Google Structured Data Testing Tool:** https://search.google.com/structured-data/testing-tool
- **Schema.org Validator:** https://validator.schema.org/

**Test each JSON-LD type:**

- [ ] BreadcrumbList appears correctly
- [ ] Course structured data is valid
- [ ] ItemList for department pages validates
- [ ] WebPage structured data present on all pages
- [ ] WebApplication for timetable validates
- [ ] No errors or warnings in validators

### 4. Sitemap Validation

**Validation Steps:**

```bash
# Download sitemap
curl https://nthumods.com/sitemap.xml > sitemap.xml

# Validate XML syntax
xmllint --noout sitemap.xml

# Check sitemap with online tools
# - https://www.xml-sitemaps.com/validate-xml-sitemap.html
# - Google Search Console sitemap report
```

**Checklist:**

- [ ] XML is well-formed (no syntax errors)
- [ ] All URLs use HTTPS and absolute paths
- [ ] URLs return 200 status (no 404s)
- [ ] hreflang alternates are correct (zh/en pairs)
- [ ] Sitemap size is under 50MB
- [ ] URL count is under 50,000
- [ ] lastmod dates are recent and valid
- [ ] changefreq values are reasonable
- [ ] priority values range from 0.5 to 1.0

### 5. End-to-End Testing

**Bot Simulation:**

```bash
# Test multiple bot User-Agents
for ua in "Googlebot/2.1" "facebookexternalhit/1.1" "WhatsApp/2.0" "Twitterbot/1.0" "LinkedInBot/1.0"
do
  echo "Testing with $ua"
  curl -A "$ua" -I https://nthumods.com/zh/courses/SOME_COURSE_ID
done
```

**Performance Testing:**

- [ ] Bot responses are under 500ms
- [ ] Non-bot requests have zero overhead
- [ ] Edge cache hit rate is high (check Cloudflare analytics)
- [ ] No increase in API load (verify via API logs)

**Regression Testing:**

- [ ] SPA routing still works
- [ ] All pages load correctly for regular users
- [ ] JavaScript execution is unaffected
- [ ] No console errors in browser
- [ ] React Helmet still updates on route changes

### 6. Post-Deploy Validation

**Google Search Console:**

- [ ] Submit updated sitemap to GSC
- [ ] Monitor crawl errors for new URLs
- [ ] Check index coverage report
- [ ] Verify no increase in errors or warnings

**Real-World Social Media Testing:**

```
1. Share course link in LINE
2. Share course link in WhatsApp
3. Share course link in Facebook Messenger
4. Share course link on Twitter
5. Share course link on LinkedIn
```

- [ ] All show correct course-specific preview
- [ ] Titles are complete (not truncated)
- [ ] Descriptions are relevant
- [ ] Images load correctly

**Search Engine Monitoring:**

- Monitor Google Search Console for rich result appearances
- Check if breadcrumbs appear in search results (may take weeks)
- Track impressions and clicks on course pages

---

## Implementation File Structure

### New Files

```
apps/web/
├── worker.ts (COMPLETE REWRITE)
└── src/
    ├── components/
    │   └── SEO/
    │       ├── useBreadcrumbJsonLd.ts (NEW)
    │       ├── useWebPageJsonLd.ts (NEW)
    │       ├── useItemListJsonLd.ts (NEW)
    │       └── useStructuredData.ts (NEW)
    └── hooks/
        └── useDepartmentSEO.ts (NEW - department meta detection)
```

### Modified Files

```
apps/web/
└── src/
    ├── components/
    │   ├── SEOHead.tsx (ENHANCE - add breadcrumb support)
    │   └── CourseDetails/
    │       └── CourseDetailsContainer.tsx (ADD breadcrumbs, WebPage JSON-LD)
    ├── app/[lang]/(mods-pages)/
    │   ├── courses/
    │   │   ├── page.tsx (ADD department detection & SEO)
    │   │   └── CourseSearchContainer.tsx (ADD department SEO)
    │   ├── timetable/
    │   │   └── page.tsx (ADD WebApplication JSON-LD)
    │   └── bus/
    │       ├── page.tsx (ADD bus listing SEO)
    │       └── [route]/
    │           ├── page.tsx (ADD route SEO)
    │           └── BusDetailsContainer.tsx (ADD BreadcrumbList)
    └── layouts/
        └── TitleUpdater.tsx (ADD WebPage JSON-LD for all routes)
```

### Implementation Order

**Phase 1: Core Worker** (Essential)

1. Restore bot detection logic in worker.ts
2. Implement course detail page handler
3. Add error handling and fallback logic
4. Test with curl and local wrangler dev

**Phase 2: Worker Extensions** (High Value) 5. Add department page handler 6. Add bus page handler 7. Implement sitemap generation 8. Add edge caching for all API calls

**Phase 3: React Hooks** (Foundation) 9. Create useBreadcrumbJsonLd hook 10. Create useWebPageJsonLd hook 11. Create useStructuredData utility hook 12. Create useItemListJsonLd hook

**Phase 4: React Components** (SEO Enhancement) 13. Enhance CourseDetailsContainer with breadcrumbs 14. Add department SEO to courses page 15. Add timetable WebApplication JSON-LD 16. Add bus pages SEO and breadcrumbs 17. Enhance TitleUpdater with WebPage JSON-LD

**Phase 5: Testing** (Critical) 18. Local worker testing (curl + bot UAs) 19. Deploy to preview environment 20. Meta tag validation (Google/Facebook/Twitter tools) 21. Structured data validation (schema.org validator) 22. Sitemap validation and submission 23. Real-world social media link testing

**Phase 6: Monitoring** (Post-Deploy) 24. Submit sitemap to Google Search Console 25. Monitor crawl errors and index coverage 26. Track rich result appearances 27. Measure search traffic changes

---

## Key Helper Functions

### Worker Functions

```typescript
// worker.ts

interface Env {
  ASSETS: Fetcher;
}

// Bot detection
const BOT_UA_FRAGMENTS = [
  "googlebot",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "applebot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "line-poker",
  "line/",
  "kakaotalk",
  "slackbot",
  "embedly",
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_FRAGMENTS.some((f) => ua.includes(f));
}

// Course detail page handler
async function handleCourseDetailPage(
  lang: string,
  courseId: string,
  env: Env,
): Promise<Response> {
  try {
    const apiRes = await fetch(
      `https://api.nthumods.com/course/${encodeURIComponent(courseId)}`,
      { cf: { cacheTtl: 86400, cacheEverything: true } },
    );

    if (!apiRes.ok) return env.ASSETS.fetch(request);
    const course = await apiRes.json();
    if (!course?.name_zh) return env.ASSETS.fetch(request);

    const metaData = buildCourseMetaData(course, lang);
    return injectMetaTags(env, metaData);
  } catch {
    return env.ASSETS.fetch(request);
  }
}

// Department page handler
async function handleDepartmentPage(url: URL, env: Env): Promise<Response> {
  try {
    const dept = url.searchParams.get("department");
    if (!dept) return env.ASSETS.fetch(request);

    const apiRes = await fetch(
      `https://api.nthumods.com/courses?department=${encodeURIComponent(dept)}&limit=500`,
      { cf: { cacheTtl: 86400, cacheEverything: true } },
    );

    if (!apiRes.ok) return env.ASSETS.fetch(request);
    const courses = await apiRes.json();

    const metaData = buildDepartmentMetaData(
      dept,
      courses,
      url.pathname.includes("/zh/") ? "zh" : "en",
    );
    return injectMetaTags(env, metaData);
  } catch {
    return env.ASSETS.fetch(request);
  }
}

// Bus page handler
async function handleBusPage(
  lang: string,
  route: string,
  env: Env,
): Promise<Response> {
  try {
    const apiRes = await fetch(
      `https://api.nthumods.com/bus/${encodeURIComponent(route)}`,
      { cf: { cacheTtl: 604800, cacheEverything: true } }, // 7 days
    );

    if (!apiRes.ok) return env.ASSETS.fetch(request);
    const busData = await apiRes.json();

    const metaData = buildBusMetaData(busData, lang);
    return injectMetaTags(env, metaData);
  } catch {
    return env.ASSETS.fetch(request);
  }
}

// Sitemap generator
async function generateSitemap(env: Env): Promise<Response> {
  try {
    // Check Cloudflare cache for existing sitemap
    const cache = caches.default;
    const cacheKey = new Request(
      "https://nthumods.com/__internal__/sitemap-cache",
    );
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Generate fresh sitemap
    const coursesRes = await fetch(
      "https://api.nthumods.com/courses?limit=10000",
      { cf: { cacheTtl: 86400, cacheEverything: true } },
    );

    if (!coursesRes.ok) return fallbackSitemap();
    const courses = await coursesRes.json();

    const xml = buildSitemapXML(courses);

    const response = new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400",
      },
    });

    // Store in Cloudflare cache for 24 hours
    await cache.put(cacheKey, response.clone());

    return response;
  } catch {
    return fallbackSitemap();
  }
}

// Meta tag injection
function injectMetaTags(env: Env, metaData: MetaData): Response {
  const spaRes = await env.ASSETS.fetch(
    new Request(`${url.origin}/index.html`),
  );

  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(metaData.title);
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        el.setAttribute("content", metaData.description);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute("content", metaData.ogTitle);
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        el.setAttribute("content", metaData.ogDescription);
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute("content", metaData.canonicalUrl);
      },
    })
    .on('meta[property="og:type"]', {
      element(el) {
        el.setAttribute("content", metaData.ogType);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute("href", metaData.canonicalUrl);
      },
    })
    .transform(spaRes);
}
```

### React Hooks

```typescript
// useBreadcrumbJsonLd.ts
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function useBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// useWebPageJsonLd.ts
export interface WebPageData {
  title: string;
  description: string;
  url: string;
  lang?: string;
}

export function useWebPageJsonLd(data: WebPageData) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.title,
    description: data.description,
    url: data.url,
    inLanguage: data.lang === "en" ? "en-US" : "zh-TW",
    isPartOf: {
      "@type": "WebSite",
      url: "https://nthumods.com",
    },
  };
}

// useStructuredData.ts
export function useStructuredData<T>(generator: () => T | null): T | null {
  try {
    return generator();
  } catch (error) {
    console.error("Structured data generation failed:", error);
    return null;
  }
}
```

---

## Success Metrics

**Immediate (Post-Deploy):**

- [ ] All social media link previews show course-specific info
- [ ] No increase in error rate or response time
- [ ] Sitemap successfully submitted to Google Search Console
- [ ] Meta tag validators show no errors

**Short-term (1-2 weeks):**

- [ ] Google Search Console shows increased indexed pages
- [ ] No crawl errors on new URLs
- [ ] Social media link previews working consistently

**Long-term (1-3 months):**

- [ ] Rich results appearing in Google Search (breadcrumbs, course data)
- [ ] Increased organic search traffic to course pages
- [ ] Higher click-through rates from search results
- [ ] Course pages ranking for target keywords (e.g., "清大電機課程")

---

## Rollback Plan

**If critical issues occur post-deploy:**

1. **Immediate:** Revert worker.ts to minimal passthrough version

   ```typescript
   export default {
     async fetch(request, env) {
       return env.ASSETS.fetch(request);
     },
   };
   ```

2. **Deploy hotfix** via git commit

   ```bash
   git revert HEAD
   git push
   ```

3. **React layer continues working** as fallback (no regression for users)

4. **Debug offline** using wrangler dev and fix issues

5. **Redeploy** once tested and validated

**Partial rollback options:**

- Disable sitemap generation only (return static sitemap)
- Disable specific page type handlers (e.g., department pages)
- Reduce cache TTL if stale data is an issue

---

## Future Enhancements

**Not in scope for initial implementation, but possible later:**

1. **Teacher pages SEO** - Add meta tags for `?teacher=X` query params
2. **Course review aggregation** - Add AggregateRating JSON-LD with review data
3. **Event JSON-LD** - For course start/end dates and exam schedules
4. **Video structured data** - If course intro videos are added
5. **FAQPage JSON-LD** - For help/FAQ sections
6. **Dynamic Open Graph images** - Generate course-specific preview images
7. **Prerender service** - For even better bot support (if needed)

---

## Conclusion

This design restores the SEO capabilities lost during the Cloudflare Pages migration and significantly enhances them with comprehensive structured data, dynamic sitemap generation, and multi-page-type support. The hybrid approach (Worker + React) provides both optimal bot performance and reliable fallbacks, ensuring the site is well-optimized for search engines and social media while maintaining excellent performance for regular users.

The implementation prioritizes reliability with extensive error handling, graceful degradation, and comprehensive testing at every stage.
