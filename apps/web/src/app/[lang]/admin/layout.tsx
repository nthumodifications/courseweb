import { NavLink, Outlet, useParams } from "react-router-dom";
import { Suspense } from "react";
import { useAuth } from "react-oidc-context";
import { Badge, Button, cn } from "@courseweb/ui";
import {
  Activity,
  ArrowLeft,
  KeyRound,
  Megaphone,
  ScrollText,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useAdminIdentity } from "./api";

/**
 * The admin center's shell.
 *
 * Deliberately not the student app's layout: no course sidebar, no bottom nav,
 * no chat. Staff tools and student tools sharing a chrome is how someone ends
 * up banning an account while thinking they are looking at their timetable.
 */

const NAV = [
  { to: "", label: "Overview", icon: Activity, end: true },
  { to: "users", label: "Users", icon: Users, end: false },
  { to: "announcements", label: "Announcements", icon: Megaphone, end: false },
  { to: "clients", label: "OAuth Clients", icon: KeyRound, superuser: true },
  { to: "audit", label: "Audit Log", icon: ScrollText, end: false },
] as const;

const CenteredNotice = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="grid min-h-screen place-items-center px-6">
    <div className="flex max-w-md flex-col items-center gap-3 text-center">
      <ShieldAlert className="h-8 w-8 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  </div>
);

const AdminLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const auth = useAuth();
  const { data: identity, isLoading, isError } = useAdminIdentity();

  const base = `/${lang === "en" ? "en" : "zh"}/admin`;

  if (auth.isLoading || isLoading) {
    return (
      <CenteredNotice
        title="Checking access"
        description="Verifying your NTHUMods staff permissions."
      />
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <CenteredNotice
        title="Sign in required"
        description="The admin center is only available to signed-in NTHUMods staff."
        action={
          <Button onClick={() => void auth.signinRedirect()}>
            Sign in with NTHU
          </Button>
        }
      />
    );
  }

  if (isError) {
    return (
      <CenteredNotice
        title="Could not reach the auth server"
        description="The admin API did not respond. Try again in a moment."
      />
    );
  }

  // A non-staff account is told the page does not exist rather than that it
  // exists and is closed to them: the console's shape is not public knowledge.
  if (!identity?.isAdmin) {
    return (
      <CenteredNotice
        title="Page not found"
        description="There is nothing here."
        action={
          <Button variant="outline" asChild>
            <NavLink to={`/${lang === "en" ? "en" : "zh"}/today`}>
              Back to NTHUMods
            </NavLink>
          </Button>
        }
      />
    );
  }

  const visibleNav = NAV.filter(
    (item) => !("superuser" in item && item.superuser) || identity.isSuperuser,
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <NavLink
            to={`/${lang === "en" ? "en" : "zh"}/today`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">NTHUMods</span>
          </NavLink>
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight">Admin Center</span>
            <Badge variant={identity.isSuperuser ? "default" : "secondary"}>
              {identity.role}
            </Badge>
          </div>
          <div className="ml-auto min-w-0 text-right text-sm">
            <div className="truncate font-medium">{identity.name}</div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {identity.userId}
            </div>
          </div>
        </div>

        <nav className="mx-auto max-w-7xl overflow-x-auto px-2">
          <ul className="flex min-w-max items-center gap-1 pb-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to || "overview"}>
                  <NavLink
                    to={item.to ? `${base}/${item.to}` : base}
                    end={item.to === ""}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        isActive && "bg-muted text-foreground",
                      )
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Suspense
          fallback={
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          }
        >
          <Outlet context={identity} />
        </Suspense>
      </main>
    </div>
  );
};

export default AdminLayout;
