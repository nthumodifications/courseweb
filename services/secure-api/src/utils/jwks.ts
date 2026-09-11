import { exportJWK, importSPKI, type JWK } from "jose";

/** The single signing key's id, as advertised in id_token headers. */
export const SIGNING_KID = "1";

/**
 * Turn the configured RS256 public key into the JWK served at
 * /.well-known/jwks.json.
 *
 * `extractable` matters: it defaults to false, and a non-extractable CryptoKey
 * cannot be exported as a JWK at all. Only jose's browser build (WebCrypto)
 * enforces the flag — the Node build uses KeyObject, where everything is
 * exportable — so omitting it fails on the deployed container while passing
 * locally.
 *
 * The environment stores the PEM on one line with escaped newlines, which are
 * restored here.
 */
export async function loadSigningJwk(publicKeyPem: string): Promise<JWK> {
  const pem = publicKeyPem.replaceAll(String.raw`\n`, "\n");
  const key = await importSPKI(pem, "RS256", { extractable: true });

  const jwk = await exportJWK(key);
  jwk.kid = SIGNING_KID;
  jwk.use = "sig";
  jwk.alg = "RS256";
  jwk.kty = "RSA";
  return jwk;
}
