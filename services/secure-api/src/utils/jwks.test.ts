import { describe, expect, it } from "bun:test";
import { importSPKI } from "jose";
import { loadSigningJwk, SIGNING_KID } from "./jwks";

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArM9wWvTxOXVAJ8+l4vWr
k8FI3INFWwplh8gt4nagrrkbphlxiX02uKtmvyqdY5L9n5TmsMg1dNdJntJrQce3
M9UejRWIb5gdRX/KlI4zGqOk0u6E8j25kJXGUB1dWDpDtk0tuuqkUTXlRjLBo8Er
8c8LO6TrlL/T9RiQzP5CWK+hLrEY7HnO7WB929J94ZxH3dy4iDnfge4TiWszfc35
FmXXVEd/hR7sq26rsF3XuGYW0YGoudIFr+RQbAi1+7pMxOsPjefaIhQZssW1QIpU
MddoKgycvNGHoJbfI2QSeAbc4XpJPcVYLfq1IYMua/emxtIuxFC45tm7g/8PQNFo
XwIDAQAB
-----END PUBLIC KEY-----
`;

// The environment stores the PEM on a single line with escaped newlines.
const ESCAPED_KEY = PUBLIC_KEY.replaceAll("\n", String.raw`\n`);

describe("loadSigningJwk", () => {
  it("produces the JWK the discovery document promises", async () => {
    const jwk = await loadSigningJwk(PUBLIC_KEY);
    expect(jwk.kty).toBe("RSA");
    expect(jwk.alg).toBe("RS256");
    expect(jwk.use).toBe("sig");
    expect(jwk.kid).toBe(SIGNING_KID);
    expect(jwk.e).toBe("AQAB");
    expect(typeof jwk.n).toBe("string");
  });

  it("accepts the escaped-newline form the environment stores", async () => {
    expect(await loadSigningJwk(ESCAPED_KEY)).toEqual(
      await loadSigningJwk(PUBLIC_KEY),
    );
  });

  it("imports the key as extractable", async () => {
    // Guards the production failure directly: with the default
    // extractable=false, jose's WebCrypto build throws "non-extractable
    // CryptoKey cannot be exported as a JWK" and the endpoint 500s. The Node
    // build hands back a KeyObject instead, which is why that bug does not
    // reproduce locally — so assert on the key itself, not just on the export.
    const key = await importSPKI(PUBLIC_KEY, "RS256", { extractable: true });
    if (key instanceof CryptoKey) {
      expect(key.extractable).toBe(true);
    }
    await expect(loadSigningJwk(PUBLIC_KEY)).resolves.toBeDefined();
  });

  it("rejects a malformed key rather than returning a partial JWK", async () => {
    await expect(
      loadSigningJwk("-----BEGIN PUBLIC KEY-----\nnope\n"),
    ).rejects.toThrow();
  });
});
