/**
 * Accounts that are superusers regardless of what the database says.
 *
 * The admin center gates itself on User.role, which is only reachable through
 * the admin API, which itself requires a superuser. That is a closed loop on a
 * fresh database, so the loop is opened here: these student IDs are promoted on
 * every sign-in, which also means an accidental demotion cannot lock the team
 * out of their own tools.
 */
export const BOOTSTRAP_SUPERUSERS: readonly string[] = ["111060062"];

export const isBootstrapSuperuser = (userId: string) =>
  BOOTSTRAP_SUPERUSERS.includes(userId);
