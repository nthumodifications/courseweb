import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDirectory, "../..");

export function parseBunRequirement(packageManager) {
  const match = /^bun@(\d+\.\d+\.\d+)$/.exec(packageManager ?? "");
  return match ? match[1] : undefined;
}

export function compareVersions(actual, expected) {
  const actualParts = String(actual).split(".").map(Number);
  const expectedParts = String(expected).split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (actualParts[index] ?? 0) - (expectedParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function parseArgs(argv) {
  return {
    doctor: argv.includes("--doctor"),
    dryRun: argv.includes("--dry-run"),
    full: argv.includes("--full"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

export function setupCopies({ full = false } = {}) {
  const copies = [["apps/web/.env.example", "apps/web/.env.development.local"]];
  if (full) {
    copies.push(
      ["services/api/.dev.vars.example", "services/api/.dev.vars"],
      ["services/secure-api/.env.example", "services/secure-api/.env"],
      ["tools/data-sync/.env.example", "tools/data-sync/.env"],
    );
  }
  return copies;
}

export function setupCommands({ full = false } = {}) {
  const commands = [
    ["run", "--cwd", "packages/shared", "build"],
    ["run", "--cwd", "packages/ui", "build"],
  ];
  if (full) {
    commands.push(
      ["run", "--cwd", "services/api", "prisma:generate"],
      ["run", "--cwd", "services/secure-api", "prisma:generate"],
      ["run", "build:apis"],
      ["run", "build:api-types"],
    );
  }
  return commands;
}

function readRootPackage() {
  return JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
}

function commandText(args) {
  return ["bun", ...args]
    .map((part) => (/^[\w./:-]+$/.test(part) ? part : JSON.stringify(part)))
    .join(" ");
}

function printHelp() {
  console.log(`Usage: bun run setup [--dry-run] [--full]
       bun run doctor

setup copies apps/web/.env.example to apps/web/.env.development.local, without replacing
an existing file, then builds the frontend-safe shared packages.

--full      also prepare backend/data-sync env files, generate Prisma clients,
            and build the API, secure API, and API-types declarations.
--dry-run   print planned checks, copies, and commands without changing files
            or running install/build/generate commands.
doctor      check the Bun version, env files, dependencies, and build outputs.
`);
}

function checkBunVersion(packageJson) {
  const required = parseBunRequirement(packageJson.packageManager);
  const actual = process.versions.bun;
  if (!required) {
    return {
      ok: false,
      message: "package.json has no supported bun@x.y.z packageManager",
    };
  }
  if (!actual) {
    return {
      ok: false,
      message: `This script must run under Bun ${required}. Install Bun ${required} and run \`bun run setup\` again.`,
    };
  }
  const [actualMajor, actualMinor] = actual.split(".").map(Number);
  const [requiredMajor, requiredMinor] = required.split(".").map(Number);
  if (
    actualMajor < requiredMajor ||
    (actualMajor === requiredMajor && actualMinor < requiredMinor)
  ) {
    return {
      ok: false,
      message: `Bun ${actual} is too old; this repo needs Bun ${requiredMajor}.${requiredMinor} or newer (pinned: ${required}). Run \`bun upgrade\`, then rerun the command.`,
    };
  }
  if (compareVersions(actual, required) !== 0) {
    return {
      ok: true,
      message: `Bun ${actual} is installed; the repo pins ${required}. This usually works. If install fails, run \`bun upgrade\`.`,
    };
  }
  return { ok: true, message: `Bun ${actual} matches packageManager.` };
}

function reportCheck(ok, message) {
  console.log(`${ok ? "[ok]" : "[!!]"} ${message}`);
}

function checkDoctor({ full }) {
  const packageJson = readRootPackage();
  let failed = false;
  const version = checkBunVersion(packageJson);
  reportCheck(version.ok, version.message);
  failed ||= !version.ok;

  for (const requiredPath of [
    "package.json",
    "bun.lock",
    "apps/web/.env.example",
  ]) {
    const present = existsSync(path.join(repoRoot, requiredPath));
    reportCheck(
      present,
      `${requiredPath} ${present ? "is present" : "is missing"}.`,
    );
    failed ||= !present;
  }

  const dependencyDir = path.join(repoRoot, "node_modules");
  const dependenciesPresent = existsSync(dependencyDir);
  reportCheck(
    dependenciesPresent,
    dependenciesPresent
      ? "node_modules is present."
      : "node_modules is missing; run bun install.",
  );
  failed ||= !dependenciesPresent;

  const envPaths = setupCopies({ full });
  for (const [, destination] of envPaths) {
    const present = existsSync(path.join(repoRoot, destination));
    reportCheck(
      present,
      present
        ? `${destination} is present.`
        : `${destination} is missing; run ${full ? "bun run setup --full" : "bun run setup"}.`,
    );
    failed ||= !present;
  }

  for (const output of [
    "packages/shared/dist",
    "packages/ui/dist",
    ...(full
      ? [
          "services/api/dist",
          "services/secure-api/dist",
          "packages/api-types/dist",
        ]
      : []),
  ]) {
    const present = existsSync(path.join(repoRoot, output));
    reportCheck(
      present,
      present
        ? `${output} is present.`
        : `${output} is missing; run ${full ? "bun run setup --full" : "bun run setup"}.`,
    );
    failed ||= !present;
  }

  if (!failed) {
    console.log(
      full
        ? "Doctor found a complete full setup. Start the web app with bun run dev:web."
        : "Doctor found a frontend setup. Start the web app with bun run dev:web.",
    );
  }
  return failed ? 1 : 0;
}

function copyMissing(source, destination, dryRun) {
  const sourcePath = path.join(repoRoot, source);
  const destinationPath = path.join(repoRoot, destination);
  if (!existsSync(sourcePath)) {
    throw new Error(`Example file is missing: ${source}`);
  }
  if (existsSync(destinationPath)) {
    console.log(
      `[skip] ${destination} already exists; it was not overwritten.`,
    );
    return;
  }
  console.log(`[${dryRun ? "plan" : "copy"}] ${source} -> ${destination}`);
  if (!dryRun) {
    mkdirSync(path.dirname(destinationPath), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
  }
}

function runCommand(args, dryRun) {
  console.log(`[${dryRun ? "plan" : "run"}] ${commandText(args)}`);
  if (dryRun) return 0;
  const result = Bun.spawnSync([process.execPath, ...args], {
    cwd: repoRoot,
    // The API schema reads DATABASE_URL even for `prisma generate`; any
    // well-formed value lets a fresh checkout generate the client.
    env: { DATABASE_URL: "file:./dev.db", ...process.env },
    stdout: "inherit",
    stderr: "inherit",
  });
  return result.exitCode;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const packageJson = readRootPackage();
  const version = checkBunVersion(packageJson);
  if (options.doctor) return checkDoctor(options);

  reportCheck(version.ok, version.message);
  if (!version.ok && !options.dryRun) return 1;

  console.log(
    options.full
      ? "Preparing frontend and backend development files. Backend env files contain placeholders; fill them with maintainer-provided values before starting services."
      : "Preparing frontend-only development against the production API (real data; public write forms are blocked locally).",
  );
  if (options.dryRun) {
    console.log("[plan] bun install --frozen-lockfile (skipped by --dry-run)");
  } else {
    const installExitCode = runCommand(["install", "--frozen-lockfile"], false);
    if (installExitCode !== 0) return installExitCode;
  }

  for (const [source, destination] of setupCopies(options)) {
    copyMissing(source, destination, options.dryRun);
  }
  for (const command of setupCommands(options)) {
    const exitCode = runCommand(command, options.dryRun);
    if (exitCode !== 0) return exitCode;
  }

  console.log("\nSetup complete. Next: bun run dev:web");
  console.log("Open http://localhost:5173");
  if (!options.full) {
    console.log(
      "For backend work and trustworthy cross-workspace type-checking, run bun run setup --full after filling the maintainer-owned env values.",
    );
  }
  return 0;
}

if (import.meta.main) {
  process.exitCode = main();
}
