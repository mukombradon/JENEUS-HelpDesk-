import { useState, useCallback } from "react";
import { useDashboardSummary } from "../../hooks/useApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Users,
  Building2,
  RefreshCw,
  AlertCircle,
  Ticket,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import type { DashboardSummary } from "../../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type DateRange = "7d" | "30d" | "90d";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#eb5757",
  high: "#f2994a",
  medium: "#f2c94c",
  low: "#9ca3af",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#8b5cf6",
  pending: "#f2994a",
  resolved: "#27ae60",
  closed: "#6b7280",
  cancelled: "#9ca3af",
};

const CHART_AXIS_STYLE = { fontSize: 11, fill: "#8a8f98" };

// ---------------------------------------------------------------------------
// Custom tooltip for recharts
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; color?: string; name?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-hairline bg-surface-2 px-3 py-2 shadow-card">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold text-ink" style={{ color: entry.color }}>
          {entry.name ?? "Value"}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
}

function StatCard({ icon: Icon, label, value, color, subtext }: StatCardProps) {
  return (
    <Card className="transition-colors hover:border-hairline-strong">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-ink-subtle">{label}</p>
            <p
              className="text-3xl font-semibold tracking-tight"
              style={color ? { color } : undefined}
            >
              {value}
            </p>
            {subtext && (
              <p className="text-xs text-ink-subtle">{subtext}</p>
            )}
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color ?? "#8a8f98"}12` }}
          >
            <Icon className="h-5 w-5" style={{ color: color ?? "#8a8f98" }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ManagementSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      {/* Filter */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-md" />
        ))}
      </div>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-semantic-danger/10">
        <AlertCircle className="h-7 w-7 text-semantic-danger" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-ink">
        Failed to load dashboard
      </h3>
      <p className="mb-6 text-sm text-ink-subtle">
        Something went wrong. Please try again.
      </p>
      <Button variant="secondary" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ManagementDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const { data, isLoading, isError, refetch } = useDashboardSummary();

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) return <ManagementSkeleton />;
  if (isError) return <ErrorState onRetry={handleRetry} />;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Management Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-ink-subtle">
            Overview of ticket metrics, team performance, and SLA compliance.
          </p>
        </div>

        {/* Date range filter */}
        <div className="flex gap-1 rounded-lg border border-hairline bg-surface-2 p-0.5">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                dateRange === r.value
                  ? "bg-surface-3 text-ink shadow-sm"
                  : "text-ink-subtle hover:text-ink",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <StatCardsRow data={data!} />

      {/* Charts */}
      <ChartsSection data={data!} />

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SLAComplianceCard data={data!} />
        <TopClientsCard data={data!} />
      </div>

      {/* Agent workload table */}
      <AgentWorkloadCard data={data!} />

      {/* Recurring Issues heatmap */}
      <RecurringIssuesCard />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat cards row
// ---------------------------------------------------------------------------

function StatCardsRow({ data }: { data: DashboardSummary }) {
  const totalOpen =
    (data.tickets_by_status.open ?? 0) +
    (data.tickets_by_status.in_progress ?? 0) +
    (data.tickets_by_status.pending ?? 0);

  const criticalCount = data.tickets_by_priority.critical ?? 0;

  // Sum all resolved times / resolved count for average
  const resolutionEntries = Object.entries(data.resolution_time_avg ?? {});
  const avgResolution =
    resolutionEntries.length > 0
      ? resolutionEntries.reduce((sum, [, val]) => sum + val, 0) /
        resolutionEntries.length
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={Ticket}
        label="Total Open"
        value={totalOpen}
        color="#5e6ad2"
        subtext={
          data.tickets_by_status.open != null
            ? `${data.tickets_by_status.open} unassigned`
            : undefined
        }
      />
      <StatCard
        icon={AlertTriangle}
        label="Critical Priority"
        value={criticalCount}
        color="#eb5757"
      />
      <StatCard
        icon={AlertCircle}
        label="SLA Breached"
        value={data.tickets_by_status.closed ?? 0}
        color="#eb5757"
      />
      <StatCard
        icon={Clock}
        label="Avg Resolution Time"
        value={formatHours(avgResolution)}
        color="#f2994a"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts section (2-column grid)
// ---------------------------------------------------------------------------

function ChartsSection({ data }: { data: DashboardSummary }) {
  // Bar chart data: tickets by priority
  const barData = Object.entries(data.tickets_by_priority ?? {}).map(
    ([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      fill: PRIORITY_COLORS[key] ?? "#8a8f98",
    }),
  );

  // Pie chart data: tickets by status
  const statusLabelMap: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    pending: "Pending",
    resolved: "Resolved",
    closed: "Closed",
    cancelled: "Cancelled",
  };
  const pieData = Object.entries(data.tickets_by_status ?? {})
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: statusLabelMap[key] ?? key,
      value,
      color: STATUS_COLORS[key] ?? "#8a8f98",
    }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Bar chart: Open Tickets by Priority */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-ink-subtle" />
            <CardTitle className="text-sm font-medium text-ink">
              Open Tickets by Priority
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#23252a"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={CHART_AXIS_STYLE}
                  axisLine={{ stroke: "#23252a" }}
                  tickLine={false}
                />
                <YAxis
                  tick={CHART_AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#18191a" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Donut chart: Tickets by Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-ink-subtle" />
            <CardTitle className="text-sm font-medium text-ink">
              Tickets by Status
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={96}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="ml-2 space-y-1.5">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-ink-muted">{entry.name}</span>
                  <span className="text-xs font-medium text-ink">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLA Compliance card
// ---------------------------------------------------------------------------

function SLAComplianceCard({ data }: { data: DashboardSummary }) {
  const rate = data.sla_compliance_rate ?? 0;
  const trend = rate >= 95 ? "up" : rate >= 80 ? "stable" : "down";
  const trendColor =
    trend === "up"
      ? "#27a644"
      : trend === "stable"
        ? "#f2994a"
        : "#eb5757";
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "stable" ? Clock : TrendingDown;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-ink">
          SLA Compliance Rate
        </CardTitle>
        <CardDescription>
          Percentage of tickets resolved within SLA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="flex flex-col">
            <span
              className="text-5xl font-bold tracking-tight"
              style={{ color: trendColor }}
            >
              {rate.toFixed(1)}%
            </span>
            <div className="mt-1 flex items-center gap-1">
              <TrendIcon
                className="h-4 w-4"
                style={{ color: trendColor }}
              />
              <span className="text-xs" style={{ color: trendColor }}>
                {trend === "up"
                  ? "Above target"
                  : trend === "stable"
                    ? "Near target"
                    : "Below target"}
              </span>
            </div>
          </div>
          {/* Mini radial bar */}
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-ink-subtle">Target</p>
              <p className="text-sm font-medium text-ink">95.0%</p>
            </div>
            <div className="relative h-20 w-20">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#23252a"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke={trendColor}
                  strokeWidth="3"
                  strokeDasharray={`${Math.min(rate, 100)} ${100 - Math.min(rate, 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-sm font-semibold"
                style={{ color: trendColor }}
              >
                {rate.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Top Clients by Volume
// ---------------------------------------------------------------------------

function TopClientsCard({ data }: { data: DashboardSummary }) {
  const clients = data.top_clients ?? [];

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-ink">
            Top Clients by Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-ink-subtle">
            No client data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...clients.map((c) => c.ticket_count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-ink-subtle" />
          <CardTitle className="text-sm font-medium text-ink">
            Top Clients by Volume
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clients.slice(0, 6).map((entry, i) => (
            <div key={entry.client.id} className="flex items-center gap-3">
              <span className="w-5 text-xs font-medium text-ink-subtle">
                {i + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-ink truncate">
                    {entry.client.name}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">
                    {entry.ticket_count}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(entry.ticket_count / maxCount) * 100}%`,
                      backgroundColor: "#5e6ad2",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Agent Workload table
// ---------------------------------------------------------------------------

function AgentWorkloadCard({ data }: { data: DashboardSummary }) {
  const agents = data.agent_workload ?? [];

  if (agents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ink-subtle" />
            <CardTitle className="text-sm font-medium text-ink">
              Agent Workload
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-ink-subtle">
            No agent workload data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-ink-subtle" />
          <CardTitle className="text-sm font-medium text-ink">
            Agent Workload
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[320px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th className="px-5 py-3 text-left text-xs font-medium text-ink-subtle">
                  Agent
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-ink-subtle">
                  Open Tickets
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-ink-subtle">
                  Avg Resolution
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-ink-subtle">
                  SLA Breaches
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((entry) => {
                const breachColor =
                  entry.sla_breach_count > 3
                    ? "#eb5757"
                    : entry.sla_breach_count > 0
                      ? "#f2994a"
                      : "#27a644";
                return (
                  <tr
                    key={entry.agent.id}
                    className="border-b border-hairline/50 transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                          {entry.agent.first_name.charAt(0)}
                          {entry.agent.last_name.charAt(0)}
                        </div>
                        <span className="text-ink">
                          {entry.agent.first_name} {entry.agent.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-ink">
                      {entry.open_tickets}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-muted">
                      {formatHours(entry.avg_resolution_time)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className="font-medium"
                        style={{ color: breachColor }}
                      >
                        {entry.sla_breach_count}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recurring Issues heatmap card (category x frequency)
// ---------------------------------------------------------------------------

const MOCK_HEATMAP_DATA: { category: string; count: number; level: number }[] = [
  { category: "Network", count: 24, level: 0.9 },
  { category: "Email", count: 18, level: 0.7 },
  { category: "Hardware", count: 15, level: 0.6 },
  { category: "Software", count: 22, level: 0.85 },
  { category: "Access", count: 12, level: 0.5 },
  { category: "Database", count: 8, level: 0.35 },
  { category: "Security", count: 6, level: 0.25 },
  { category: "Billing", count: 10, level: 0.4 },
];

function RecurringIssuesCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-ink-subtle" />
          <CardTitle className="text-sm font-medium text-ink">
            Recurring Issues by Category
          </CardTitle>
          <CardDescription>
            Frequency of issue categories over the selected period
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {MOCK_HEATMAP_DATA.map((item) => {
            const intensity = Math.min(item.level + 0.15, 1);
            const r = Math.round(235 - intensity * 180);
            const g = Math.round(235 - intensity * 160);
            const b = Math.round(245 - intensity * 180);
            return (
              <div
                key={item.category}
                className="flex flex-col items-center gap-1.5 rounded-lg p-3 text-center transition-transform hover:scale-105"
                style={{
                  backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
                  border: `1px solid rgba(${r}, ${g}, ${b}, 0.2)`,
                }}
              >
                <span className="text-xs font-medium text-ink">
                  {item.category}
                </span>
                <span
                  className="text-lg font-bold"
                  style={{
                    color: `rgb(${Math.round(247 - intensity * 160)}, ${Math.round(248 - intensity * 140)}, ${Math.round(248 - intensity * 150)})`,
                  }}
                >
                  {item.count}
                </span>
                <span className="text-[10px] text-ink-subtle">tickets</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHours(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = Math.round(hours / 24);
  return `${days}d`;
}
