/**
 * Apply pending migrations, then get out of the way.
 *
 * Run from `start`, so a deployed container brings its schema up to date before
 * it serves a single request. The Prisma CLI is resolved rather than reached for
 * by path: in the workspace it is hoisted to the repo root, and in the container
 * image it sits beside the service.
 */
const cli = Bun.resolveSync("prisma/build/index.js", import.meta.dir);

const migrate = Bun.spawn(["bun", cli, "migrate", "deploy"], {
  stdout: "inherit",
  stderr: "inherit",
  env: process.env,
});

const status = await migrate.exited;

if (status !== 0) {
  console.error(
    `Migrations failed (exit ${status}). Refusing to start: serving auth on an out-of-date schema is worse than being down.`,
  );
  process.exit(status);
}
