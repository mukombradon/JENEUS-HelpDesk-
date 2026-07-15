import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  RefreshCw,
  LogOut,
  Building2,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";
import type { Ticket, PaginatedResponse } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy");
}

// ---------------------------------------------------------------------------
// Portal API instance (uses portal token)
// ---------------------------------------------------------------------------

function portalGet<T>(url: string, config?: Record<string, unknown>) {
  return api.get<T>(url, {
    ...config,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("portal_access_token")}`,
    },
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-8 w-64" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState("all");

  // Fetch portal tickets
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["portal", "tickets", filterTab],
    queryFn: () => {
      const params: Record<string, unknown> = {
        limit: 50,
        sort_by: "updated_at",
        sort_order: "desc",
      };
      if (filterTab === "open") params.status = "open,in_progress,pending";
      else if (filterTab === "resolved") params.status = "resolved,closed";
      return portalGet<PaginatedResponse<Ticket>>("/portal/tickets", { params })
        .then((r) => r.data);
    },
  });

  const tickets = data?.data ?? [];
  const total = data?.total ?? 0;

  // Derived stats
  const openCount = tickets.filter((t) =>
    ["open", "in_progress", "pending"].includes(t.status)
  ).length;
  const resolvedCount = tickets.filter((t) =>
    ["resolved", "closed"].includes(t.status)
  ).length;

  // Filter displayed tickets
  const displayedTickets = useMemo(() => {
    if (filterTab === "all") return tickets;
    if (filterTab === "open")
      return tickets.filter((t) => ["open", "in_progress", "pending"].includes(t.status));
    if (filterTab === "resolved")
      return tickets.filter((t) => ["resolved", "closed"].includes(t.status));
    return tickets;
  }, [tickets, filterTab]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("portal_access_token");
    toast({ title: "Logged out", variant: "success" });
    navigate("/portal");
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-ink">
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-1">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-ink">Client Portal</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => navigate("/portal/profile")}>
            <User className="h-4 w-4 mr-1" />
            Profile
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <TicketIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-ink-subtle uppercase tracking-wider">Total Tickets</p>
                <p className="text-xl font-semibold text-ink">{total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-md bg-semantic-warning/10 p-2">
                <Clock className="h-4 w-4 text-semantic-warning" />
              </div>
              <div>
                <p className="text-xs text-ink-subtle uppercase tracking-wider">Open</p>
                <p className="text-xl font-semibold text-ink">{openCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-md bg-semantic-success/10 p-2">
                <CheckCircle className="h-4 w-4 text-semantic-success" />
              </div>
              <div>
                <p className="text-xs text-ink-subtle uppercase tracking-wider">Resolved</p>
                <p className="text-xl font-semibold text-ink">{resolvedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">My Tickets</h2>
          <Button size="sm" onClick={() => navigate("/portal/tickets/new")}>
            <Plus className="h-4 w-4 mr-1" />
            New Ticket
          </Button>
        </div>

        {/* Filter tabs */}
        <Tabs value={filterTab} onValueChange={setFilterTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open ({openCount})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Ticket list */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : isError ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-8 w-8 text-semantic-danger mx-auto mb-2" />
              <p className="text-sm text-ink-muted mb-3">Failed to load tickets.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Retry
              </Button>
            </CardContent>
          </Card>
        ) : displayedTickets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-8 w-8 text-ink-subtle mx-auto mb-2" />
              <p className="text-sm text-ink-muted">
                {filterTab === "all"
                  ? "You haven't submitted any tickets yet."
                  : `No ${filterTab} tickets.`}
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => navigate("/portal/tickets/new")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Your First Ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {displayedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-4 rounded-md bg-surface-1 border border-hairline hover:bg-surface-2 transition-colors cursor-pointer"
                onClick={() => navigate(`/portal/tickets/${ticket.id}`)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                    <TicketIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-primary">
                        {ticket.ticket_number}
                      </span>
                      <span className="text-sm font-medium text-ink truncate">
                        {ticket.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-subtle">
                      <Badge
                        variant={
                          ticket.status.replace("_", "-") as
                            | "open"
                            | "in-progress"
                            | "pending"
                            | "resolved"
                            | "closed"
                            | "cancelled"
                        }
                        className="text-[10px]"
                      >
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      <span>Updated {formatDate(ticket.updated_at)}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-subtle shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
