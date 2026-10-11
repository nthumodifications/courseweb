import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { CHANGELOG } from "@/const/changelog";
import { ROUTE_PATHS } from "@/routerPaths";
import { CHANGELOG_PREVIEW_REGISTRY } from "./previewRegistry";
import {
  getHighlightedRelease,
  hasReleaseActionForHref,
  isReleaseUnread,
  shouldShowWhatsNew,
} from "./changelogLogic";

const matchesRoutePath = (pathname: string, routePath: string) => {
  const pathnameParts = pathname.split("/");
  const routeParts = routePath.split("/");
  return (
    pathnameParts.length === routeParts.length &&
    routeParts.every(
      (part, index) => part.startsWith(":") || part === pathnameParts[index],
    )
  );
};

describe("What's new release selection", () => {
  test("selects the highlighted release", () => {
    expect(getHighlightedRelease(CHANGELOG)?.version).toBe("2026.10.2");
  });

  test("keeps releases newest-first with one highlighted release", () => {
    expect(CHANGELOG).toEqual(
      [...CHANGELOG].sort(
        (left, right) =>
          right.date.localeCompare(left.date) ||
          right.version.localeCompare(left.version),
      ),
    );
    expect(CHANGELOG.filter((release) => release.highlight)).toHaveLength(1);
  });

  test("keeps English and Traditional Chinese release copy in parity", () => {
    for (const release of CHANGELOG) {
      if (release.title) {
        expect(Object.keys(release.title).sort()).toEqual(["en", "zh"]);
      }
      for (const item of release.items) {
        expect(Object.keys(item.title).sort()).toEqual(["en", "zh"]);
        if (item.description) {
          expect(Object.keys(item.description).sort()).toEqual(["en", "zh"]);
        }
      }
    }
  });

  test("shows the current release when the version has not been seen", () => {
    expect(
      shouldShowWhatsNew({
        lastSeenVersion: null,
        currentVersion: "2026.10.2",
        hasVisitedBefore: true,
        hasOpenDialog: false,
      }),
    ).toBe(true);
  });

  test("shows an unseen release after onboarding", () => {
    expect(
      shouldShowWhatsNew({
        lastSeenVersion: "2026.09.1",
        currentVersion: "2026.10.2",
        hasVisitedBefore: true,
        hasOpenDialog: false,
      }),
    ).toBe(true);
  });

  test("waits while onboarding or another dialog is open", () => {
    for (const state of [
      { hasVisitedBefore: false, hasOpenDialog: false },
      { hasVisitedBefore: true, hasOpenDialog: true },
    ]) {
      expect(
        shouldShowWhatsNew({
          lastSeenVersion: "2026.09.1",
          currentVersion: "2026.10.2",
          ...state,
        }),
      ).toBe(false);
    }
  });

  test("keeps the indicator tied to onboarding and the last seen version", () => {
    expect(
      isReleaseUnread({
        lastSeenVersion: null,
        currentVersion: "2026.10.2",
        hasVisitedBefore: true,
      }),
    ).toBe(true);
    expect(
      isReleaseUnread({
        lastSeenVersion: "2026.09.1",
        currentVersion: "2026.10.2",
        hasVisitedBefore: true,
      }),
    ).toBe(true);
    expect(
      isReleaseUnread({
        lastSeenVersion: "2026.10.2",
        currentVersion: "2026.10.2",
        hasVisitedBefore: true,
      }),
    ).toBe(false);
    expect(
      isReleaseUnread({
        lastSeenVersion: null,
        currentVersion: "2026.10.2",
        hasVisitedBefore: false,
      }),
    ).toBe(false);
  });
});

test("matches release actions to localized and locale-free links", () => {
  const release = CHANGELOG.find((entry) => entry.version === "2026.10.1");
  expect(release).toBeDefined();

  expect(hasReleaseActionForHref(release!, "/bus")).toBe(true);
  expect(hasReleaseActionForHref(release!, "/zh/bus")).toBe(true);
  expect(hasReleaseActionForHref(release!, "/courses/modules")).toBe(true);
  expect(hasReleaseActionForHref(release!, "/settings")).toBe(false);
});

test("every release visual has a registry entry or public image", () => {
  for (const release of CHANGELOG) {
    for (const item of release.items) {
      if (item.visual?.kind === "component") {
        expect(item.visual.id in CHANGELOG_PREVIEW_REGISTRY).toBe(true);
      }
      if (item.visual?.kind === "image") {
        const imagePath = resolve(
          import.meta.dir,
          "../../../public",
          item.visual.src.replace(/^\/+/, ""),
        );
        expect(existsSync(imagePath)).toBe(true);
      }
    }
  }
});

test("every release action matches a real router path", () => {
  const routePaths = new Set(Object.values(ROUTE_PATHS));

  for (const release of CHANGELOG) {
    for (const item of release.items) {
      if (!item.action) continue;
      const pathname = new URL(
        item.action.href,
        "https://nthumods.test",
      ).pathname.slice(1);
      expect(
        [...routePaths].some((routePath) =>
          matchesRoutePath(pathname, routePath),
        ),
      ).toBe(true);
    }
  }
});
