/**
 * OIDC client registry management for auth.nthumods.com.
 *
 * Usage (run from services/secure-api, DATABASE_URL must be set):
 *
 *   bun run scripts/manage-clients.ts list
 *   bun run scripts/manage-clients.ts show <client_id>
 *   bun run scripts/manage-clients.ts upsert <client_id> \
 *       --name "Display Name" --client-uri https://example.com \
 *       --redirect-uri https://example.com/auth/callback \
 *       --logout-uri  https://example.com \
 *       --scope openid --scope profile --scope email --scope offline_access \
 *       [--first-party] [--confidential] [--rotate-secret] [--replace] [--dry-run]
 *   bun run scripts/manage-clients.ts consents <client_id>
 *   bun run scripts/manage-clients.ts revoke-consent <client_id> [user_id]
 *   bun run scripts/manage-clients.ts delete <client_id>
 *
 * Flags may be repeated. By default upsert merges the given URIs/scopes into
 * the existing record; --replace overwrites them instead.
 *
 * --name is what the consent screen shows the user, and is required for any
 * third-party client that can reach /authorize.
 *
 * Public clients (the default) have no client_secret, which makes the
 * authorize endpoint require PKCE S256. Only pass --confidential for
 * machine-to-machine clients that call /introspect with Basic auth.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VALID_SCOPES = new Set([
  "openid",
  "profile",
  "email",
  "offline_access",
  "kv",
  "calendar",
  "planner",
]);

type Flags = {
  redirectUris: string[];
  logoutUris: string[];
  scopes: string[];
  name?: string;
  clientUri?: string;
  firstParty: boolean;
  confidential: boolean;
  rotateSecret: boolean;
  replace: boolean;
  dryRun: boolean;
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    redirectUris: [],
    logoutUris: [],
    scopes: [],
    firstParty: false,
    confidential: false,
    rotateSecret: false,
    replace: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--redirect-uri":
        flags.redirectUris.push(argv[++i]!);
        break;
      case "--logout-uri":
        flags.logoutUris.push(argv[++i]!);
        break;
      case "--scope":
        flags.scopes.push(argv[++i]!);
        break;
      case "--name":
        flags.name = argv[++i]!;
        break;
      case "--client-uri":
        flags.clientUri = argv[++i]!;
        break;
      case "--first-party":
        flags.firstParty = true;
        break;
      case "--confidential":
        flags.confidential = true;
        break;
      case "--rotate-secret":
        flags.rotateSecret = true;
        break;
      case "--replace":
        flags.replace = true;
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return flags;
}

function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCodePoint(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function assertHttpsOrLocalhost(uris: string[]) {
  for (const uri of uris) {
    const url = new URL(uri);
    const isLocal =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !isLocal) {
      throw new Error(
        `Redirect/logout URI must be https (or localhost): ${uri}`,
      );
    }
    if (url.hash) throw new Error(`URI must not contain a fragment: ${uri}`);
  }
}

function describe(client: {
  clientId: string;
  name?: string | null;
  clientUri?: string | null;
  firstParty?: boolean;
  redirectUris: string[];
  logoutUris: string[];
  scopes: string[];
  clientSecret: string | null;
}) {
  return {
    client_id: client.clientId,
    name: client.name ?? null,
    client_uri: client.clientUri ?? null,
    party: client.firstParty ? "first-party" : "third-party (consent required)",
    type: client.clientSecret ? "confidential" : "public (PKCE required)",
    redirect_uris: client.redirectUris,
    logout_uris: client.logoutUris,
    scopes: client.scopes,
  };
}

const [command, ...rest] = process.argv.slice(2);

if (command === "list") {
  const clients = await prisma.client.findMany({
    orderBy: { clientId: "asc" },
  });
  console.log(JSON.stringify(clients.map(describe), null, 2));
} else if (command === "show") {
  const clientId = rest[0];
  if (!clientId) throw new Error("show requires a client_id");
  const client = await prisma.client.findUnique({ where: { clientId } });
  if (!client) throw new Error(`No such client: ${clientId}`);
  console.log(JSON.stringify(describe(client), null, 2));
} else if (command === "upsert") {
  const [clientId, ...flagArgv] = rest;
  if (!clientId) throw new Error("upsert requires a client_id");
  const flags = parseFlags(flagArgv);

  assertHttpsOrLocalhost([...flags.redirectUris, ...flags.logoutUris]);
  const unknownScopes = flags.scopes.filter(
    (scope) => !VALID_SCOPES.has(scope) && !scope.startsWith("introspect:"),
  );
  if (unknownScopes.length) {
    throw new Error(`Unknown scopes: ${unknownScopes.join(", ")}`);
  }

  const existing = await prisma.client.findUnique({ where: { clientId } });
  const merge = (current: string[], incoming: string[]) =>
    flags.replace || !existing
      ? incoming
      : [...new Set([...current, ...incoming])];

  const redirectUris = merge(existing?.redirectUris ?? [], flags.redirectUris);
  const logoutUris = merge(existing?.logoutUris ?? [], flags.logoutUris);
  const scopes = merge(existing?.scopes ?? [], flags.scopes);

  let clientSecret = existing?.clientSecret ?? null;
  let freshSecret: string | null = null;
  if (flags.confidential && (flags.rotateSecret || !clientSecret)) {
    freshSecret = generateSecret();
    clientSecret = freshSecret;
  } else if (!flags.confidential && existing?.clientSecret) {
    throw new Error(
      `${clientId} is confidential; pass --confidential to keep its secret, or delete and re-create it as a public client`,
    );
  }

  const name = flags.name ?? existing?.name ?? null;
  const clientUri = flags.clientUri ?? existing?.clientUri ?? null;
  const firstParty = flags.firstParty || (existing?.firstParty ?? false);

  // Only clients that can reach /authorize ever render a consent screen.
  if (!firstParty && !name && redirectUris.length > 0) {
    throw new Error(
      `${clientId} is third-party and needs --name: the consent screen shows it to the user`,
    );
  }

  const data = {
    clientId,
    name,
    clientUri,
    firstParty,
    redirectUris,
    logoutUris,
    scopes,
    clientSecret,
  };

  if (flags.dryRun) {
    console.log("[dry-run] would write:");
    console.log(JSON.stringify(describe(data), null, 2));
  } else {
    const saved = await prisma.client.upsert({
      where: { clientId },
      update: {
        name,
        clientUri,
        firstParty,
        redirectUris,
        logoutUris,
        scopes,
        clientSecret,
      },
      create: data,
    });
    console.log(existing ? "Updated client:" : "Created client:");
    console.log(JSON.stringify(describe(saved), null, 2));
  }

  if (freshSecret) {
    console.log("\nclient_secret (shown once, store it now):");
    console.log(freshSecret);
  }
} else if (command === "consents") {
  // Who has granted this client access, and to what.
  const clientId = rest[0];
  if (!clientId) throw new Error("consents requires a client_id");
  const consents = await prisma.clientConsent.findMany({
    where: { clientId },
    orderBy: { grantedAt: "desc" },
  });
  console.log(`${consents.length} user(s) have consented to ${clientId}`);
  console.log(
    JSON.stringify(
      consents.map((consent) => ({
        user_id: consent.userId,
        scopes: consent.scopes,
        granted_at: consent.grantedAt.toISOString(),
      })),
      null,
      2,
    ),
  );
} else if (command === "revoke-consent") {
  // Withdraw a grant. The user is asked again on their next sign-in.
  const [clientId, userId] = rest;
  if (!clientId) throw new Error("revoke-consent requires a client_id");
  const { count } = await prisma.clientConsent.deleteMany({
    where: { clientId, ...(userId ? { userId } : {}) },
  });
  console.log(
    userId
      ? `Revoked ${count} consent for ${userId} on ${clientId}`
      : `Revoked ${count} consent(s) on ${clientId}`,
  );
} else if (command === "delete") {
  const clientId = rest[0];
  if (!clientId) throw new Error("delete requires a client_id");
  await prisma.client.delete({ where: { clientId } });
  console.log(`Deleted client: ${clientId}`);
} else {
  console.log(
    [
      "Commands:",
      "  list",
      "  show <client_id>",
      "  upsert <client_id> [flags]",
      "  consents <client_id>",
      "  revoke-consent <client_id> [user_id]",
      "  delete <client_id>",
    ].join("\n"),
  );
  process.exitCode = 1;
}

await prisma.$disconnect();
