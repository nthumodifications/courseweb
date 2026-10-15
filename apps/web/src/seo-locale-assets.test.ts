import { expect, test } from "bun:test";

const readPublicAsset = (name: string) =>
  Bun.file(new URL(`../public/${name}`, import.meta.url)).text();

test("static sitemap exposes the Simplified Chinese locale", async () => {
  const sitemap = await readPublicAsset("sitemap.xml");

  expect(sitemap).toContain("https://nthumods.com/zh-cn/courses");
  expect(sitemap).toContain('hreflang="zh-CN"');
  expect(sitemap).toContain("https://nthumods.com/zh-cn/timetable");
});

test("robots mirrors private-route exclusions for zh-cn", async () => {
  const robots = await readPublicAsset("robots.txt");

  for (const suffix of [
    "student/",
    "settings",
    "proxy-login",
    "next-steps",
    "waitlist",
  ]) {
    expect(robots).toContain(`Disallow: /zh-cn/${suffix}`);
  }
});
