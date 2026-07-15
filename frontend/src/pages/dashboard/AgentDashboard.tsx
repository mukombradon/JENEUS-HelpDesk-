import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useAgentDashboard } from "../../hooks/useApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import {
  Ticket,
  Clock,
  AlertCircle,
  Activity,
  Plus,
  ArrowUpRight,
  MessageSquare,
  UserCheck,
  FileText,
  Keyboard,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityLog } from "../../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  pulse?: boolean;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, count, color, pulse }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-colors hover:border-hairline-strong">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-ink-subtle">{label}</p>
            <p
              className={cn(
                "text-3xl font-semibold tracking-tight",
                pulse && "animate-pulse",
              )}
              style={{ color }}
            >
              {count}
            </p>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}12` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
      {/* Subtle bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
        style={{ backgroundColor: color }}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loading
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Activity section */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity row helpers
// ---------------------------------------------------------------------------

const actionIcons: Record<string, React.ElementType> = {
  ticket_created: Plus,
  ticket_assigned: UserCheck,
  comment_added: MessageSquare,
  status_changed: Activity,
  sla_warning: Clock,
  sla_breached: AlertCircle,
  escalated: ArrowUpRight,
};

function getActionIcon(action: string): React.ElementType {
  return actionIcons[action] ?? Activity;
}

function getActionColor(action: string): string {
  if (action === "sla_breached" || action === "escalated") return "#eb5757";
  if (action === "sla_warning") return "#f2994a";
  if (action === "ticket_assigned") return "#5e6ad2";
  if (action === "comment_added") return "#27a644";
  return "#8a8f98";
}

function formatActionLabel(log: ActivityLog): string {
  switch (log.action) {
    case "ticket_created":
      return `Created ticket`;
    case "ticket_assigned":
      return `Assigned to you`;
    case "comment_added":
      return `New comment`;
    case "status_changed":
      return `Status changed: ${log.new_value ?? "updated"}`;
    case "sla_warning":
      return `SLA warning`;
    case "sla_breached":
      return `SLA breached`;
    case "escalated":
      return `Ticket escalated`;
    default:
      return log.action.replace(/_/g, " ");
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ userName }: { userName: string }) {
  return (
    <Card className="border-hairline">
      <CardContent className="flex flex-col items-center py-16">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-3">
          <Inbox className="h-7 w-7 text-ink-subtle" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-ink">
          Welcome, {userName}!
        </h3>
        <p className="mb-6 max-w-md text-center text-sm text-ink-subtle">
          You don&apos;t have any tickets assigned yet. Here are a few things
          you can do to get started.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-hairline bg-surface-2 px-5 py-4 text-center">
            <Plus className="h-5 w-5 text-primary" />
            <span className="text-xs text-ink-muted">
              Create your first ticket
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-hairline bg-surface-2 px-5 py-4 text-center">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-xs text-ink-muted">
              Browse the knowledge base
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-hairline bg-surface-2 px-5 py-4 text-center">
            <UserCheck className="h-5 w-5 text-primary" />
            <span className="text-xs text-ink-muted">
              Check your profile settings
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AgentDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useAgentDashboard(user?.id ?? "");

  const userName = user
    ? `${user.first_name} ${user.last_name}`
    : "Agent";

  if (isLoading) return <DashboardSkeleton />;

  const hasTickets =
    data &&
    Object.values(data.my_tickets).some((v) => v > 0);

  if (!hasTickets) return <EmptyState userName={userName} />;

  const myOpenTickets = data!.my_tickets.open ?? 0;
  const inProgressTickets = data!.my_tickets.in_progress ?? 0;
  const pendingTickets = data!.my_tickets.pending ?? 0;
  const slaAtRisk = data!.sla_at_risk?.length ?? 0;

  return (
    <div className="space-y-6 p-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Good {getGreeting()}, {userName}
          </h1>
          <p className="mt-0.5 text-sm text-ink-subtle">
            Here&apos;s an overview of your tickets and activity.
          </p>
        </div>
        <Button onClick={() => navigate("/tickets/new")}>
          <Plus className="h-4 w-4" />
          Create Ticket
          <kbd className="ml-1 hidden items-center gap-0.5 rounded border border-hairline bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium text-ink-muted sm:inline-flex">
            <Keyboard className="h-3 w-3" />
            N
          </kbd>
        </Button>
      </div>

      {/* Stats cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Ticket}
          label="My Open Tickets"
          count={myOpenTickets}
          color="#3b82f6"
        />
        <StatCard
          icon={Activity}
          label="In Progress"
          count={inProgressTickets}
          color="#8b5cf6"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          count={pendingTickets}
          color="#f2994a"
        />
        <StatCard
          icon={AlertCircle}
          label="SLA at Risk"
          count={slaAtRisk}
          color="#eb5757"
          pulse={slaAtRisk > 0}
        />
      </div>

      {/* SLA at Risk tickets detail */}
      {slaAtRisk > 0 && data!.sla_at_risk.length > 0 && (
        <Card className="border-semantic-danger/20 bg-semantic-danger/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-semantic-danger">
              <AlertCircle className="h-4 w-4" />
              SLA at Risk — {slaAtRisk} ticket{slaAtRisk > 1 ? "s" : ""} need
              attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data!.sla_at_risk.slice(0, 5).map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant={
                        ticket.priority === "critical"
                          ? "critical"
                          : ticket.priority === "high"
                            ? "high"
                            : ticket.priority === "medium"
                              ? "medium"
                              : "low"
                      }
                      className="shrink-0"
                    >
                      {ticket.priority}
                    </Badge>
                    <span className="truncate text-sm text-ink">
                      {ticket.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-subtle shrink-0">
                    <span>
                      #{ticket.ticket_number}
                    </span>
                    {ticket.resolution_due_at && (
                      <span className="text-semantic-danger">
                        {formatDistanceToNow(
                          new Date(ticket.resolution_due_at),
                          { addSuffix: true },
                        )}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-ink">
            <Activity className="h-4 w-4 text-ink-subtle" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data!.recent_activity && data!.recent_activity.length > 0 ? (
            <ScrollArea className="max-h-[420px]">
              <div className="px-5 pb-2">
                {data!.recent_activity.map((log, idx) => {
                  const Icon = getActionIcon(log.action);
                  const color = getActionColor(log.action);
                  return (
                    <div key={log.id}>
                      <div className="flex items-start gap-3 py-3">
                        <div
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}14` }}
                        >
                          <Icon
                            className="h-4 w-4"
                            style={{ color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink">
                            {formatActionLabel(log)}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-subtle">
                            {formatDistanceToNow(new Date(log.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                      {idx < data!.recent_activity.length - 1 && (
                        <Separator />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="px-5 pb-5 text-center text-sm text-ink-subtle">
              No recent activity on your tickets.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
