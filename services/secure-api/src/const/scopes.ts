/**
 * Every scope the authorization server will issue.
 *
 * Shared between the authorize endpoint, which rejects anything outside this
 * list, and the admin center's client registration form, so a client can never
 * be registered asking for a scope that would then be refused at sign-in.
 */
export const VALID_SCOPES = [
  "openid", // sub
  "profile", // name, name_en, inschool
  "email", // email
  "offline_access",
  "kv",
  "calendar",
  "planner",
] as const;

export type Scope = (typeof VALID_SCOPES)[number];
