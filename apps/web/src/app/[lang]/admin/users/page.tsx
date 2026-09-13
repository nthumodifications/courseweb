import { useState } from "react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useDebounceValue } from "usehooks-ts";
import {
  Badge,
  Button,
  Input,
  useToast,
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
} from "@courseweb/ui";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  Mono,
  PageHeader,
  RoleBadge,
  formatDateTime,
} from "../components";
import {
  useAdminUsers,
  useSetUserRole,
  type AdminIdentity,
  type AdminRole,
  type AdminUser,
} from "../api";

const PAGE_SIZE = 25;

/**
 * Staff access, changed from the row rather than only from the detail page.
 *
 * Promoting somebody is the single most common reason to open this table, and
 * making it a two-page trip was the main thing people could not find. Rendered
 * only for a superuser, since that is who the server lets change a role at all.
 */
const RoleCell = ({
  user,
  identity,
}: {
  user: AdminUser;
  identity: AdminIdentity;
}) => {
  const { toast } = useToast();
  const setRole = useSetUserRole();

  if (!identity.isSuperuser || user.userId === identity.userId) {
    return <RoleBadge role={user.role} />;
  }

  const change = async (role: AdminRole) => {
    if (role === user.role) return;
    try {
      await setRole.mutateAsync({ userId: user.userId, role });
      toast({ title: `${user.userId} is now ${role.toLowerCase()}` });
    } catch (error) {
      toast({
        title: "Could not change the role",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <Select
      value={user.role}
      onValueChange={(value) => change(value as AdminRole)}
      disabled={setRole.isPending}
    >
      <SelectTrigger
        className="h-8 w-[124px]"
        aria-label={`Role for ${user.userId}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">User</SelectItem>
        <SelectItem value="ADMIN">Admin</SelectItem>
        <SelectItem value="SUPERUSER">Superuser</SelectItem>
      </SelectContent>
    </Select>
  );
};

/**
 * The user directory.
 *
 * Filters live in the URL so a maintainer can paste "every suspended account"
 * into a thread instead of describing which three dropdowns to set.
 */
const AdminUsersPage = () => {
  const { lang } = useParams<{ lang: string }>();
  const identity = useOutletContext<AdminIdentity>();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const role = (searchParams.get("role") ?? "all") as AdminRole | "all";
  const banned = searchParams.get("banned") ?? "all";

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  // Typing a student ID is nine keystrokes; querying on each one would be nine
  // round trips to answer one question.
  const [debouncedSearch] = useDebounceValue(searchInput, 300);

  const query = useAdminUsers({
    q: debouncedSearch.trim() || undefined,
    role: role === "all" ? undefined : role,
    banned: banned === "all" ? undefined : (banned as "true" | "false"),
    page,
    pageSize: PAGE_SIZE,
  });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    // Any filter change invalidates the page number it was paired with.
    if (key !== "page") next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account that has signed in through NTHUMods."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-8"
            placeholder="Student ID, name or email"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              updateParam("q", event.target.value);
            }}
            aria-label="Search users"
          />
        </div>

        <Select
          value={role}
          onValueChange={(value) => updateParam("role", value)}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="SUPERUSER">Superuser</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={banned}
          onValueChange={(value) => updateParam("banned", value)}
        >
          <SelectTrigger className="w-[160px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="false">Active</SelectItem>
            <SelectItem value="true">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isError && <ErrorState error={query.error} />}

      <div className="overflow-x-auto rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="w-[140px]">Role</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="hidden lg:table-cell w-[150px]">
                Joined
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading &&
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {query.data?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link
                    to={`/${lang}/admin/users/${user.userId}`}
                    className="font-mono text-xs underline-offset-2 hover:underline"
                  >
                    {user.userId}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[220px]">
                  <div className="truncate">{user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {user.nameEn}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Mono>{user.email}</Mono>
                </TableCell>
                <TableCell>
                  <RoleCell user={user} identity={identity} />
                </TableCell>
                <TableCell>
                  {user.banned ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : user.inschool ? (
                    <span className="text-xs text-muted-foreground">
                      In school
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Alumni
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Mono>{formatDateTime(user.createdAt)}</Mono>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!query.isLoading && query.data?.users.length === 0 && (
          <EmptyState>No accounts match those filters.</EmptyState>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total.toLocaleString()} account{total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParam("page", String(page - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </Button>
          <span className="tabular-nums">
            {page} / {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= lastPage}
            onClick={() => updateParam("page", String(page + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </>
  );
};

export default AdminUsersPage;
