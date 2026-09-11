import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from "@courseweb/ui";
import { ArrowLeft } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  InlineSpinner,
  Mono,
  PageHeader,
  RoleBadge,
  StatCard,
  formatDateTime,
  relativeTime,
} from "../../components";
import {
  useAdminUser,
  useRevokeUserSessions,
  useSetUserBan,
  useSetUserRole,
  type AdminIdentity,
  type AdminRole,
  type AdminUserDetail,
} from "../../api";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something failed.";

const DateValue = ({
  value,
  withRelative = false,
}: {
  value: string | null | undefined;
  withRelative?: boolean;
}) => (
  <div className="whitespace-nowrap">
    <Mono>{formatDateTime(value)}</Mono>
    {withRelative && value && (
      <div className="text-xs text-muted-foreground">{relativeTime(value)}</div>
    )}
  </div>
);

const ScopeBadges = ({ scopes }: { scopes: string[] }) =>
  scopes.length ? (
    <div className="flex min-w-[150px] flex-wrap gap-1">
      {scopes.map((scope, index) => (
        <Badge
          key={`${scope}-${index}`}
          variant="outline"
          className="px-1.5 py-0 text-[10px]"
        >
          {scope}
        </Badge>
      ))}
    </div>
  ) : (
    <span className="text-xs text-muted-foreground">None</span>
  );

const UserDetailLoading = () => (
  <div className="space-y-6">
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[
        "Live tokens",
        "API keys",
        "Calendar share links",
        "Consented clients",
      ].map((label) => (
        <StatCard key={label} label={label} value={undefined} loading />
      ))}
    </section>
    <section className="space-y-6">
      {[
        "Sessions",
        "Active tokens",
        "API keys",
        "Calendar share links",
        "Consented clients",
      ].map((title) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </section>
  </div>
);

const SessionsCard = ({
  sessions,
}: {
  sessions: AdminUserDetail["sessions"];
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Sessions</CardTitle>
    </CardHeader>
    <CardContent className="p-0 sm:p-6 sm:pt-0">
      {sessions.length === 0 ? (
        <EmptyState>No sessions for this account.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead>Authenticated at</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Badge
                      variant={
                        session.state.toUpperCase() === "ACTIVE"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {session.state}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DateValue value={session.authenticatedAt} withRelative />
                  </TableCell>
                  <TableCell>
                    <DateValue value={session.expiresAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

const TokensCard = ({ tokens }: { tokens: AdminUserDetail["tokens"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Active tokens</CardTitle>
    </CardHeader>
    <CardContent className="p-0 sm:p-6 sm:pt-0">
      {tokens.length === 0 ? (
        <EmptyState>No active tokens for this account.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Client ID</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    <Badge variant="outline">{token.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="break-all">
                      <Mono>{token.clientId}</Mono>
                    </span>
                  </TableCell>
                  <TableCell>
                    <ScopeBadges scopes={token.scopes} />
                  </TableCell>
                  <TableCell>
                    <DateValue value={token.expiresAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

const ApiKeysCard = ({ apiKeys }: { apiKeys: AdminUserDetail["apiKeys"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">API keys</CardTitle>
    </CardHeader>
    <CardContent className="p-0 sm:p-6 sm:pt-0">
      {apiKeys.length === 0 ? (
        <EmptyState>No API keys for this account.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="max-w-[220px] break-words">
                    {apiKey.name}
                  </TableCell>
                  <TableCell>
                    <ScopeBadges scopes={apiKey.scopes} />
                  </TableCell>
                  <TableCell>
                    <DateValue value={apiKey.createdAt} />
                  </TableCell>
                  <TableCell>
                    <DateValue value={apiKey.lastUsedAt} withRelative />
                  </TableCell>
                  <TableCell>
                    <DateValue value={apiKey.expiresAt} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={apiKey.isRevoked ? "destructive" : "secondary"}
                    >
                      {apiKey.isRevoked ? "Revoked" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

const ShareTokensCard = ({
  shareTokens,
}: {
  shareTokens: AdminUserDetail["shareTokens"];
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Calendar share links</CardTitle>
    </CardHeader>
    <CardContent className="p-0 sm:p-6 sm:pt-0">
      {shareTokens.length === 0 ? (
        <EmptyState>No calendar share links for this account.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shareTokens.map((shareToken) => (
                <TableRow key={shareToken.id}>
                  <TableCell className="max-w-[220px] break-words">
                    {shareToken.name}
                  </TableCell>
                  <TableCell>
                    <DateValue value={shareToken.createdAt} />
                  </TableCell>
                  <TableCell>
                    <DateValue value={shareToken.lastUsedAt} withRelative />
                  </TableCell>
                  <TableCell>
                    <DateValue value={shareToken.expiresAt} />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge
                        variant={
                          shareToken.revokedAt ? "destructive" : "secondary"
                        }
                      >
                        {shareToken.revokedAt ? "Revoked" : "Active"}
                      </Badge>
                      {shareToken.revokedAt && (
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(shareToken.revokedAt)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        shareToken.includeFullDetails ? "default" : "outline"
                      }
                    >
                      {shareToken.includeFullDetails
                        ? "Full details"
                        : "Busy/free only"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

const ConsentsCard = ({
  consents,
}: {
  consents: AdminUserDetail["consents"];
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Consented clients</CardTitle>
    </CardHeader>
    <CardContent className="p-0 sm:p-6 sm:pt-0">
      {consents.length === 0 ? (
        <EmptyState>No consented clients for this account.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Client ID</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Granted at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consents.map((consent) => (
                <TableRow key={consent.id}>
                  <TableCell>
                    <span className="break-all">
                      <Mono>{consent.clientId}</Mono>
                    </span>
                  </TableCell>
                  <TableCell>
                    <ScopeBadges scopes={consent.scopes} />
                  </TableCell>
                  <TableCell>
                    <DateValue value={consent.grantedAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

const UserActions = ({
  userId,
  user,
  bootstrapSuperuser,
  identity,
}: {
  userId: string;
  user: AdminUserDetail["user"];
  bootstrapSuperuser: boolean;
  identity: AdminIdentity;
}) => {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<AdminRole>(user.role);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  const roleMutation = useSetUserRole();
  const banMutation = useSetUserBan();
  const revokeMutation = useRevokeUserSessions();

  const isOwnAccount = identity.userId === user.userId;
  const roleDisabledReason = bootstrapSuperuser
    ? "This account is the bootstrap superuser and cannot be demoted."
    : isOwnAccount
      ? "You cannot change your own role."
      : undefined;
  const roleUnchanged = selectedRole === user.role;
  const roleActionDisabled =
    Boolean(roleDisabledReason) || roleUnchanged || roleMutation.isPending;

  const changeRole = async () => {
    try {
      await roleMutation.mutateAsync({ userId, role: selectedRole });
      toast({
        title: "Role updated",
        description: `${user.name} is now ${selectedRole}.`,
      });
      setRoleDialogOpen(false);
    } catch (error) {
      toast({
        title: "Could not change role",
        description: errorMessage(error),
        variant: "destructive",
      });
    }
  };

  const changeBanState = async () => {
    const banned = !user.banned;
    try {
      await banMutation.mutateAsync({
        userId,
        banned,
        ...(banned && suspendReason.trim()
          ? { reason: suspendReason.trim() }
          : {}),
      });
      toast({
        title: banned ? "Account suspended" : "Account restored",
        description: banned
          ? "Every token and session was deleted immediately."
          : "The account can sign in again.",
      });
      setBanDialogOpen(false);
      if (banned) setSuspendReason("");
    } catch (error) {
      toast({
        title: banned
          ? "Could not suspend account"
          : "Could not restore account",
        description: errorMessage(error),
        variant: "destructive",
      });
    }
  };

  const revokeSessions = async () => {
    try {
      const result = await revokeMutation.mutateAsync({ userId });
      toast({
        title: "Sessions revoked",
        description: `${result.tokens} token${result.tokens === 1 ? "" : "s"} and ${result.sessions} session${result.sessions === 1 ? "" : "s"} deleted.`,
      });
      setRevokeDialogOpen(false);
    } catch (error) {
      toast({
        title: "Could not revoke sessions",
        description: errorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {identity.isSuperuser && (
          <div className="space-y-3 border-b pb-6">
            <div>
              <h4 className="text-sm font-medium">Change role</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Grant or remove staff access for this account.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as AdminRole)}
                disabled={Boolean(roleDisabledReason) || roleMutation.isPending}
              >
                <SelectTrigger className="w-[160px]" aria-label="New role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPERUSER">Superuser</SelectItem>
                </SelectContent>
              </Select>
              <Button
                disabled={roleActionDisabled}
                onClick={() => setRoleDialogOpen(true)}
              >
                {roleMutation.isPending && <InlineSpinner />}
                Change role
              </Button>
            </div>
            {roleDisabledReason ? (
              <p className="text-xs text-muted-foreground">
                {roleDisabledReason}
              </p>
            ) : (
              roleUnchanged && (
                <p className="text-xs text-muted-foreground">
                  Select a different role to make a change.
                </p>
              )
            )}

            <AlertDialog
              open={roleDialogOpen}
              onOpenChange={(open) => {
                if (!roleMutation.isPending) setRoleDialogOpen(open);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Change this user&apos;s role?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will change {user.name}&apos;s role from {user.role} to{" "}
                    {selectedRole}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={roleMutation.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={roleMutation.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      void changeRole();
                    }}
                  >
                    {roleMutation.isPending && <InlineSpinner />}
                    Confirm role change
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium">
              {user.banned ? "Restore account" : "Suspend account"}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {user.banned
                ? "Allow this account to sign in again."
                : "Block sign-in and delete all credentials immediately."}
            </p>
          </div>
          <Button
            variant={user.banned ? "outline" : "destructive"}
            disabled={banMutation.isPending}
            onClick={() => setBanDialogOpen(true)}
          >
            {banMutation.isPending && <InlineSpinner />}
            {user.banned ? "Restore account" : "Suspend account"}
          </Button>
        </div>

        <AlertDialog
          open={banDialogOpen}
          onOpenChange={(open) => {
            if (!banMutation.isPending) setBanDialogOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {user.banned
                  ? "Restore this account?"
                  : "Suspend this account?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {user.banned
                  ? "The user will be allowed to sign in again."
                  : "Suspending deletes every token and session immediately, and blocks this user from signing in."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {!user.banned && (
              <div className="space-y-2">
                <Label htmlFor="suspend-reason">Reason (optional)</Label>
                <Textarea
                  id="suspend-reason"
                  value={suspendReason}
                  onChange={(event) => setSuspendReason(event.target.value)}
                  maxLength={500}
                  placeholder="Explain why this account is being suspended."
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={banMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={banMutation.isPending}
                className={
                  user.banned
                    ? undefined
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }
                onClick={(event) => {
                  event.preventDefault();
                  void changeBanState();
                }}
              >
                {banMutation.isPending && <InlineSpinner />}
                {user.banned ? "Restore account" : "Suspend account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium">Revoke sessions</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign this user out everywhere without suspending the account.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={revokeMutation.isPending}
            onClick={() => setRevokeDialogOpen(true)}
          >
            {revokeMutation.isPending && <InlineSpinner />}
            Sign out everywhere
          </Button>
        </div>

        <AlertDialog
          open={revokeDialogOpen}
          onOpenChange={(open) => {
            if (!revokeMutation.isPending) setRevokeDialogOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Sign this user out everywhere?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This deletes every token and session for {user.name}. The
                account itself remains active.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={revokeMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={revokeMutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  void revokeSessions();
                }}
              >
                {revokeMutation.isPending && <InlineSpinner />}
                Revoke sessions
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

const AdminUserDetailPage = () => {
  const { lang, userId: routeUserId } = useParams<{
    lang: string;
    userId: string;
  }>();
  const userId = routeUserId ?? "";
  const identity = useOutletContext<AdminIdentity>();
  const query = useAdminUser(userId);
  const detail = query.data;

  return (
    <>
      <PageHeader
        title={detail?.user.name ?? "User"}
        description={detail?.user.nameEn}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`/${lang}/admin/users`}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to users
            </Link>
          </Button>
        }
      />

      {query.isError && <ErrorState error={query.error} />}

      {query.isLoading ? (
        <UserDetailLoading />
      ) : detail ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Mono>{detail.user.userId}</Mono>
            <Mono>{detail.user.email}</Mono>
            <span className="text-muted-foreground">
              Joined <Mono>{formatDateTime(detail.user.createdAt)}</Mono>
            </span>
            <RoleBadge role={detail.user.role} />
            {detail.user.banned && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">Suspended</Badge>
                {detail.user.bannedReason && (
                  <span className="max-w-full break-words text-xs text-destructive">
                    Reason: {detail.user.bannedReason}
                  </span>
                )}
              </div>
            )}
          </div>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Live tokens" value={detail.tokens.length} />
            <StatCard label="API keys" value={detail.apiKeys.length} />
            <StatCard
              label="Calendar share links"
              value={detail.shareTokens.length}
            />
            <StatCard
              label="Consented clients"
              value={detail.consents.length}
            />
          </section>

          <section className="space-y-6">
            <SessionsCard sessions={detail.sessions} />
            <TokensCard tokens={detail.tokens} />
            <ApiKeysCard apiKeys={detail.apiKeys} />
            <ShareTokensCard shareTokens={detail.shareTokens} />
            <ConsentsCard consents={detail.consents} />
            <UserActions
              userId={userId}
              user={detail.user}
              bootstrapSuperuser={detail.bootstrapSuperuser}
              identity={identity}
            />
          </section>
        </div>
      ) : null}
    </>
  );
};

export default AdminUserDetailPage;
