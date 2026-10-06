import { spawnSync } from "node:child_process";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LIBRARY_STATUS_URL,
  parseLibraryPayload,
  USAGE_USER_AGENT,
  type UsageSample,
} from "../src/usage/collector";
import { addLocalDays, taipeiSlotAt } from "../src/usage/model";

if (process.argv.some((argument) => argument === "--remote" || argument.includes("remote"))) {
  throw new Error("Refusing to seed a remote database; this script only permits Wrangler --local");
}
const persistIndex = process.argv.indexOf("--persist-to");
const persistTo = persistIndex >= 0 ? process.argv[persistIndex + 1] : undefined;
if (persistIndex >= 0 && !persistTo) throw new Error("--persist-to requires a local directory");

const gym: UsageSample[] = [
  { id: "a3a3fd1f-45cb-11f0-99cb-0a0527672341", name: "體能訓練室", value: 0 },
  { id: "897d1772-45cb-11f0-99cb-0a0527672341", name: "游泳池", value: 0 },
  { id: "5bdafcc0-45cb-11f0-99cb-0a0527672341", name: "校友館羽球場", value: 0 },
  { id: "17e86df6-4667-11f0-99cb-0a0527672341", name: "網球場", value: 0 },
  { id: "c4ff46db-69ea-11f0-832d-00155d32d802", name: "桌球館", value: 0 },
];

function sql(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

async function librarySeries(): Promise<UsageSample[]> {
  const response = await fetch(LIBRARY_STATUS_URL, {
    headers: { Accept: "application/json", "User-Agent": USAGE_USER_AGENT },
  });
  if (!response.ok) throw new Error(`Library seed fetch returned HTTP ${response.status}`);
  const parsed = parseLibraryPayload(await response.json());
  if (!parsed || parsed.length === 0) throw new Error("Library seed fetch returned no valid zones");
  return parsed;
}

const localToday = taipeiSlotAt(Date.now()).date;
const firstDate = addLocalDays(localToday, -42);
const lastDate = addLocalDays(localToday, -1);
const closedDate = addLocalDays(localToday, -10);
const library = await librarySeries();
const allSeries = [
  ...gym.map((sample, index) => ({ source: "gym", sample, index })),
  ...library.map((sample, index) => ({ source: "library", sample, index })),
];
const statements: string[] = [
  `DELETE FROM "UsageSlot" WHERE "source" IN ('gym', 'library');`,
  `DELETE FROM "UsageSeriesMeta" WHERE "source" IN ('gym', 'library');`,
  `DELETE FROM "UsageAnomalyState" WHERE "source" IN ('gym', 'library');`,
  `DELETE FROM "Cache" WHERE "key" LIKE 'usage-%';`,
];

for (const item of allSeries) {
  statements.push(
    `INSERT INTO "UsageSeriesMeta" ("id", "source", "seriesId", "name", "firstSeen", "lastSeen", "lastValue", "lastSampleAt", "lastValueChangedAt", "lastSuccessfulAt") VALUES (${sql(`${item.source}:${item.sample.id}`)}, ${sql(item.source)}, ${sql(item.sample.id)}, ${sql(item.sample.name)}, ${sql(firstDate)}, ${sql(lastDate)}, NULL, NULL, NULL, NULL);`,
  );
  const capacity = Math.max(20, Math.round(item.sample.value));
  const dateExpr = `date(${sql(firstDate)}, '+' || days.i || ' day')`;
  const dowExpr = `CAST(strftime('%w', ${dateExpr}) AS INTEGER)`;
  const noiseExpr = `((days.i * 17 + ${item.index} * 31 + slots.s * 13) % 5) - 2`;
  const valueExpr = item.source === "gym"
    ? `CASE WHEN ${dateExpr} = ${sql(closedDate)} THEN 0 WHEN slots.s BETWEEN 12 AND 36 THEN MAX(0, ROUND((12 + ((slots.s - 12) % 9) * 3 + ${item.index} * 4) * CASE WHEN ${dowExpr} BETWEEN 1 AND 5 THEN 1.0 ELSE 0.65 END + ${noiseExpr})) ELSE 0 END`
    : `CASE WHEN ${dateExpr} = ${sql(closedDate)} THEN ${capacity} ELSE MIN(${capacity}, MAX(0, ROUND(${capacity} * CASE WHEN slots.s BETWEEN 12 AND 36 THEN 0.55 - ((slots.s - 12) % 9) * 0.025 ELSE 1 END + ${noiseExpr}))) END`;
  statements.push(
    `WITH RECURSIVE days(i) AS (VALUES(0) UNION ALL SELECT i + 1 FROM days WHERE i < 41), slots(s) AS (VALUES(0) UNION ALL SELECT s + 1 FROM slots WHERE s < 47)
     INSERT INTO "UsageSlot" ("source", "seriesId", "date", "slot", "dow", "sum", "n", "min", "max", "lastValue", "lastSampleAt")
     SELECT ${sql(item.source)}, ${sql(item.sample.id)}, ${dateExpr}, slots.s, ${dowExpr}, ${valueExpr}, 1, ${valueExpr}, ${valueExpr}, ${valueExpr}, ${dateExpr} || 'T00:00:00.000Z'
     FROM days CROSS JOIN slots;`,
  );
}

const seedPath = join(tmpdir(), `nthumods-usage-seed-${process.pid}.sql`);
await Bun.write(seedPath, statements.join("\n"));
try {
  const command = process.platform === "win32" ? "bunx.exe" : "bunx";
  const args = ["wrangler", "d1", "execute", "data-d1", "--local", "--file", seedPath];
  if (persistTo) args.push("--persist-to", persistTo);
  const result = spawnSync(command, args, {
    cwd: join(import.meta.dir, ".."),
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
} finally {
  await unlink(seedPath).catch(() => undefined);
}

console.log(`Seeded gym=${gym.length} library=${library.length} dateRange=${firstDate}..${lastDate} closedDate=${closedDate}`);
