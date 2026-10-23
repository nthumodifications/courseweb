import { chromium, type Page, type Route } from "playwright-core";
import { extname, join, relative, resolve, dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const COURSE_ID = "11110EE  231001";
const WIDTHS = [360, 390, 430, 640, 767, 768, 820, 900, 1024, 1100, 1280, 1440, 1920];
const HEIGHT = 1000;
const GLOBAL_DEADLINE_MS = 180_000;
const API_ORIGIN = "https://api.nthumods.com";
const SUPABASE_ORIGIN = "https://cmzdlrqfpuktcczvsobs.supabase.co";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR = resolve(SCRIPT_DIR, "..", "layout-guard-artifacts");
const DIST_DIR = resolve(SCRIPT_DIR, "..", "dist");

type FixtureName = "production" | "stress";
type Language = "zh" | "en";
type Fixture = {
  course: unknown;
  ptt: unknown;
  changes: unknown;
  related: unknown;
  grades: unknown;
  moduleHistory: unknown;
};
type GuardRoute = {
  id: string;
  path: (language: Language) => string;
  languages: readonly Language[];
  fixture?: FixtureName;
  assertion?: "course-title";
};

// Add future pages here. A route owns its path, language matrix, fixture, and optional assertions.
const ROUTES: readonly GuardRoute[] = [
  {
    id: "course-production",
    path: (language) => `/${language}/courses/${encodeURIComponent(COURSE_ID)}`,
    languages: ["zh", "en"],
    fixture: "production",
    assertion: "course-title",
  },
  {
    id: "course-stress",
    path: (language) => `/${language}/courses/${encodeURIComponent(COURSE_ID)}`,
    languages: ["zh", "en"],
    fixture: "stress",
    assertion: "course-title",
  },
  {
    id: "timetable-empty",
    path: (language) => `/${language}/timetable`,
    languages: ["zh"],
  },
];

const readFixture = async (name: FixtureName): Promise<Fixture> =>
  JSON.parse(await readFile(join(SCRIPT_DIR, "layout-guard", "fixtures", `${name}.json`), "utf8")) as Fixture;

const responseFor = (fixture: Fixture, path: string): unknown => {
  const encodedCoursePath = `/course/${encodeURIComponent(COURSE_ID)}`;
  const decodedCoursePath = `/course/${COURSE_ID}`;
  const coursePath = path === encodedCoursePath ? decodedCoursePath : path;
  switch (coursePath) {
    case `${decodedCoursePath}/syllabus`:
      return fixture.course;
    case `${decodedCoursePath}/ptt`:
      return fixture.ptt;
    case `${decodedCoursePath}/changes`:
      return fixture.changes;
    case `${decodedCoursePath}/related`:
      return fixture.related;
    case "/contribute/grades/EE231001":
      return fixture.grades;
    default:
      return undefined;
  }
};

const fulfillFixture = async (route: Route, fixture: Fixture): Promise<boolean> => {
  const requestUrl = new URL(route.request().url());
  const path = decodeURIComponent(requestUrl.pathname);
  let body: unknown;

  if (requestUrl.origin === API_ORIGIN) {
    body = responseFor(fixture, path);
  } else if (requestUrl.origin === SUPABASE_ORIGIN && path === "/rest/v1/courses") {
    body = fixture.moduleHistory;
  }

  if (body === undefined) return false;
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
  return true;
};

const staticServer = async () => {
  const indexPath = join(DIST_DIR, "index.html");
  try {
    await readFile(indexPath);
  } catch {
    throw new Error(`Missing built app at ${join(DIST_DIR, "index.html")}; run bun run build first.`);
  }

  const getFilePath = (requestPath: string) => {
    const requestedPath = decodeURIComponent(requestPath);
    const candidatePath = requestedPath === "/" || !requestedPath.includes(".")
      ? indexPath
      : resolve(DIST_DIR, `.${requestedPath}`);
    const relativePath = relative(DIST_DIR, candidatePath);
    if (relativePath === ".." || relativePath.startsWith("..\\") || relativePath.startsWith("../") || /^[A-Za-z]:/.test(relativePath)) {
      return undefined;
    }
    return candidatePath;
  };

  const contentTypeFor = (filePath: string) => {
    switch (extname(filePath).toLowerCase()) {
      case ".css": return "text/css";
      case ".html": return "text/html";
      case ".js": return "text/javascript";
      case ".json": return "application/json";
      case ".map": return "application/json";
      case ".svg": return "image/svg+xml";
      case ".png": return "image/png";
      case ".jpg":
      case ".jpeg": return "image/jpeg";
      case ".webp": return "image/webp";
      case ".woff": return "font/woff";
      case ".woff2": return "font/woff2";
      default: return "application/octet-stream";
    }
  };

  const server = createServer(async (request, response) => {
    const candidatePath = getFilePath(new URL(request.url ?? "/", "http://127.0.0.1").pathname) ?? indexPath;
    try {
      response.writeHead(200, { "Content-Type": contentTypeFor(candidatePath) });
      response.end(await readFile(candidatePath));
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise<void>((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Static server did not bind a port");
  return { url: new URL(`http://127.0.0.1:${address.port}`), stop: () => server.close() };
};

const checkPage = async (page: Page, assertion?: GuardRoute["assertion"]) =>
  page.evaluate((pageAssertion) => {
    const visible = (element: Element) => {
      const htmlElement = element as HTMLElement;
      const style = getComputedStyle(htmlElement);
      const box = htmlElement.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        box.width > 0 &&
        box.height > 0
      );
    };

    const failures: Array<Record<string, unknown>> = [];
    for (const element of document.querySelectorAll("*")) {
      if (!visible(element) || element.closest("[data-layout-guard-ignore]")) continue;
      const directText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim()
        .replace(/\s+/g, " ");
      if (directText.length < 6) continue;

      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = style.lineHeight === "normal"
        ? fontSize * 1.2
        : Number.parseFloat(style.lineHeight);
      const box = element.getBoundingClientRect();
      if (fontSize >= 14 && lineHeight > 0 && box.width < 4 * fontSize && box.height > 3 * lineHeight) {
        failures.push({
          kind: "crushed-text",
          tag: element.tagName.toLowerCase(),
          classes: element.className || "",
          text: directText.slice(0, 40),
          box: { x: box.x, y: box.y, width: box.width, height: box.height },
          fontSize,
          lineHeight,
        });
      }
    }

    // The known regression is the in-between desktop band; narrow layouts stack
    // this content and wide layouts get enough room for the sibling chip rows.
    if (pageAssertion === "course-title" && window.innerWidth >= 768 && window.innerWidth <= 1200) {
      const header = document.querySelector('[data-course-detail-section="header"]');
      const title = header?.querySelector("h1");
      const row = header?.querySelector(":scope > div");
      if (!title || !row) {
        failures.push({ kind: "course-title-missing", selector: '[data-course-detail-section="header"] h1' });
      } else {
        const titleBox = title.getBoundingClientRect();
        const rowBox = row.getBoundingClientRect();
        const minimumWidth = Math.min(320, 0.6 * rowBox.width);
        if (titleBox.width + 0.5 < minimumWidth) {
          failures.push({
            kind: "course-title-width",
            tag: title.tagName.toLowerCase(),
            classes: title.className || "",
            text: (title.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
            box: { x: titleBox.x, y: titleBox.y, width: titleBox.width, height: titleBox.height },
            minimumWidth,
            headerWidth: rowBox.width,
          });
        }
      }
    }
    return failures;
  }, assertion);

const routeName = (route: GuardRoute, language: Language) => `${route.id}-${language}`;

const launchBrowser = async () => {
  const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, headless: true }
    : { channel: "chrome" as const, headless: true };

  const browser = await chromium.launch(launchOptions);
  return { browser, close: async () => { await browser.close(); } };
};

const main = async () => {
  const [production, stress] = await Promise.all([readFixture("production"), readFixture("stress")]);
  const fixtures: Record<FixtureName, Fixture> = { production, stress };
  serverHandle = await staticServer();
  const server = serverHandle;
  const startedAt = performance.now();
  const failures: string[] = [];
  let checked = 0;
  await mkdir(ARTIFACT_DIR, { recursive: true });

  browserHandle = await launchBrowser();
  const browser = browserHandle.browser;

  try {
    for (const width of WIDTHS) {
      let activeFixture: Fixture | undefined;
      const context = await browser.newContext({
        viewport: { width, height: HEIGHT },
        serviceWorkers: "block",
      });
      await context.route("**/*", async (route) => {
        const requestUrl = new URL(route.request().url());
        if (requestUrl.origin === server.url.origin) {
          await route.continue();
          return;
        }
        if (activeFixture && await fulfillFixture(route, activeFixture)) return;
        await route.abort();
      });

      try {
        for (const route of ROUTES) {
          for (const language of route.languages) {
            activeFixture = route.fixture ? fixtures[route.fixture] : undefined;
            const page = await context.newPage();
            const name = routeName(route, language);
            try {
              await page.goto(`${server.url.origin}${route.path(language)}`, { waitUntil: "domcontentloaded" });
              if (route.assertion === "course-title") {
                await page.waitForSelector('[data-course-detail-section="header"] h1', { state: "attached", timeout: 10_000 });
              }
              const pageFailures = await checkPage(page, route.assertion);
              checked += 1;
              if (pageFailures.length > 0) {
                const screenshotPath = join(ARTIFACT_DIR, `${name}-${width}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                for (const failure of pageFailures) {
                  const detail = JSON.stringify(failure);
                  const message = `FAIL route=${name} width=${width} ${detail} screenshot=${screenshotPath}`;
                  failures.push(message);
                  console.error(message);
                }
              }
            } catch (error) {
              const screenshotPath = join(ARTIFACT_DIR, `${name}-${width}.png`);
              await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
              const message = `FAIL route=${name} width=${width} error=${error instanceof Error ? error.message : String(error)} screenshot=${screenshotPath}`;
              failures.push(message);
              console.error(message);
            } finally {
              await page.close();
            }
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browserHandle.close();
    server.stop();
  }

  const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
  if (failures.length > 0) {
    console.error(`Layout guard failed: ${failures.length} invariant failure(s) across ${checked} page/width checks in ${seconds}s.`);
    process.exitCode = 1;
  } else {
    console.log(`Layout guard passed: ${checked} page/width checks in ${seconds}s.`);
  }
};

let serverHandle: Awaited<ReturnType<typeof staticServer>> | undefined;
let browserHandle: Awaited<ReturnType<typeof launchBrowser>> | undefined;
let deadlineTriggered = false;

const deadlineTimer = setTimeout(() => {
  deadlineTriggered = true;
  console.error(`Layout guard timed out after ${GLOBAL_DEADLINE_MS / 1000}s.`);
  void Promise.resolve(browserHandle?.close()).finally(() => {
    serverHandle?.stop();
    process.exit(2);
  });
}, GLOBAL_DEADLINE_MS);

try {
  await main();
} finally {
  clearTimeout(deadlineTimer);
  if (deadlineTriggered) process.exitCode = 2;
}
