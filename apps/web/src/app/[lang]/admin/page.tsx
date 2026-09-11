import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@courseweb/ui";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  StatCard,
  formatDateTime,
} from "./components";
import { useAdminClientUsage, useAdminSignups, useAdminStats } from "./api";

/**
 * Overview.
 *
 * Two questions, in order: how many people are there, and is that number
 * moving. Everything below the tiles exists to answer the second one.
 */

const RANGES = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
];

const shortDay = (day: string) => day.slice(5).replace("-", "/");

/**
 * Recharts types its `content` render prop against its own internal payload
 * shape, which changes between minor versions; this is the slice of it the
 * tooltip below actually reads.
 */
type TooltipProps = {
  active?: boolean;
  payload?: { value?: number | string; payload?: Record<string, unknown> }[];
};

const ChartTooltip = ({
  active,
  payload,
  valueLabel,
  labelFormatter,
}: {
  active?: boolean;
  payload?: { value?: number | string; payload?: Record<string, unknown> }[];
  valueLabel: string;
  labelFormatter: (raw: Record<string, unknown>) => string;
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="rounded-lg border bg-background p-2 text-sm shadow-sm">
      <div className="text-[0.7rem] uppercase text-muted-foreground">
        {labelFormatter(row.payload ?? {})}
      </div>
      <div className="font-semibold tabular-nums">
        {row.value} <span className="font-normal">{valueLabel}</span>
      </div>
    </div>
  );
};

const AdminOverviewPage = () => {
  const [range, setRange] = useState("30");
  const stats = useAdminStats();
  const signups = useAdminSignups(Number(range));
  const clientUsage = useAdminClientUsage();

  const accounts = stats.data?.accounts;
  const sessions = stats.data?.sessions;
  const content = stats.data?.content;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Accounts, sessions and content across NTHUMods."
      />

      {stats.isError && <ErrorState error={stats.error} />}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Accounts"
          value={accounts?.total}
          hint={
            accounts
              ? `+${accounts.new7d.toLocaleString()} this week`
              : undefined
          }
          loading={stats.isLoading}
        />
        <StatCard
          label="Active (30d)"
          value={accounts?.active30d}
          hint="Signed in at least once"
          loading={stats.isLoading}
        />
        <StatCard
          label="Live sessions"
          value={sessions?.active}
          hint={
            sessions
              ? `${sessions.refreshTokens.toLocaleString()} refresh tokens`
              : undefined
          }
          loading={stats.isLoading}
        />
        <StatCard
          label="Suspended"
          value={accounts?.banned}
          hint={accounts ? `${accounts.admins} staff accounts` : undefined}
          loading={stats.isLoading}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">New accounts</CardTitle>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {signups.isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : signups.isError ? (
              <ErrorState error={signups.error} />
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={signups.data?.series ?? []}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="signupFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    {/* Horizontal rules only: vertical ones compete with the
                        single series for attention and add nothing here. */}
                    <CartesianGrid
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="day"
                      tickFormatter={shortDay}
                      minTickGap={24}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={36}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--border))" }}
                      content={(props: TooltipProps) => (
                        <ChartTooltip
                          active={props.active}
                          payload={props.payload}
                          valueLabel="new accounts"
                          labelFormatter={(row) =>
                            formatDateTime(
                              `${String(row.day)}T00:00:00Z`,
                            ).slice(0, 10)
                          }
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#signupFill)"
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tokens by client (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {clientUsage.isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : clientUsage.isError ? (
              <ErrorState error={clientUsage.error} />
            ) : !clientUsage.data?.length ? (
              <EmptyState>No tokens issued in the last 30 days.</EmptyState>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={clientUsage.data.slice(0, 6)}
                    margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="clientId"
                      width={96}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      content={(props: TooltipProps) => (
                        <ChartTooltip
                          active={props.active}
                          payload={props.payload}
                          valueLabel="tokens"
                          labelFormatter={(row) =>
                            String(row.name ?? row.clientId ?? "")
                          }
                        />
                      )}
                    />
                    <Bar dataKey="tokens" radius={[0, 4, 4, 0]} barSize={16}>
                      {clientUsage.data.slice(0, 6).map((row) => (
                        <Cell
                          key={row.clientId}
                          fill="hsl(var(--primary))"
                          // First-party clients are the expected traffic; a
                          // third party climbing this list is the signal.
                          fillOpacity={row.firstParty ? 1 : 0.55}
                        />
                      ))}
                      <LabelList
                        dataKey="tokens"
                        position="right"
                        className="fill-muted-foreground"
                        fontSize={11}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credentials</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <StatCard
              label="API keys"
              value={sessions?.apiKeys}
              loading={stats.isLoading}
            />
            <StatCard
              label="Calendar links"
              value={sessions?.calendarShareTokens}
              loading={stats.isLoading}
            />
            <StatCard
              label="OAuth clients"
              value={stats.data?.oauth.clients}
              loading={stats.isLoading}
            />
            <StatCard
              label="Consents"
              value={stats.data?.oauth.consents}
              loading={stats.isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <StatCard
              label="Courses"
              value={content?.courses}
              loading={stats.isLoading}
            />
            <StatCard
              label="Course comments"
              value={content?.comments}
              loading={stats.isLoading}
            />
            <StatCard
              label="Delay reports"
              value={content?.delayReports}
              loading={stats.isLoading}
            />
            <StatCard
              label="Announcements"
              value={content?.alerts}
              loading={stats.isLoading}
            />
          </CardContent>
        </Card>
      </section>
    </>
  );
};

export default AdminOverviewPage;
