import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInHours } from "date-fns";
import {
  Plus,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Ticket as TicketIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card } from "../../components/ui/card";
import api from "../../lib/api";
import type {
  Ticket,
  TicketFilters,
  Priority,
  TicketStatus,
  TicketType,
  Client,
  User,
  Category,
  PaginatedResponse,
} from "../../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];
const STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
  "cancelled",
];

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: "incident", label: "Incident" },
  { value: "problem", label: "Problem" },
];

const SLA_OPTIONS: { value: TicketFilters["sla_status"]; label: string }[] = [
  { value: "on_track", label: "On Track" },
  { value: "at_risk", label: "At Risk" },
  { value: "breached", label: "Breached" },
];

const PAGE_SIZE = 20;

type SortField = "ticket_number" | "priority" | "created_at" | "status";
type SortDir = "asc" | "desc";

interface ColumnDef {
  key: SortField;
  label: string;
  sortable: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "ticket_number", label: "Ticket #", sortable: true },
  { key: "ticket_number", label: "Title", sortable: false },
  { key: "ticket_number", label: "Client", sortable: false },
  { key: "priority", label: "Priority", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "ticket_number", label: "Assigned To", sortable: false },
  { key: "created_at", label: "Created", sortable: true },
  { key: "ticket_number", label: "SLA Due", sortable: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function priorityBorder(priority: Priority): string {
  const map: Record<Priority, string> = {
    critical: "border-l-priority-critical",
    high: "border-l-priority-high",
    medium: "border-l-priority-medium",
    low: "border-l-priority-low",
  };
  return map[priority] ?? "border-l-hairline";
}

function priorityDot(priority: Priority): string {
  const map: Record<Priority, string> = {
    critical: "bg-priority-critical",
    high: "bg-priority-high",
    medium: "bg-priority-medium",
    low: "bg-priority-low",
  };
  return map[priority] ?? "bg-ink-subtle";
}

function statusBadgeVariant(
  status: TicketStatus
): "open" | "in-progress" | "pending" | "resolved" | "closed" | "cancelled" {
  return status.replace("_", "-") as
    | "open"
    | "in-progress"
    | "pending"
    | "resolved"
    | "closed"
    | "cancelled";
}

function slaVariant(slaStatus: TicketFilters["sla_status"]) {
  switch (slaStatus) {
    case "on_track":
      return "bg-semantic-success/15 text-semantic-success border border-semantic-success/30";
    case "at_risk":
      return "bg-semantic-warning/15 text-semantic-warning border border-semantic-warning/30";
    case "breached":
      return "bg-semantic-danger/15 text-semantic-danger border border-semantic-danger/30 animate-pulse";
    default:
      return "bg-surface-3 text-ink-muted border border-hairline";
  }
}

function getSlaStatus(ticket: Ticket): TicketFilters["sla_status"] {
  if (ticket.sla_breach) return "breached";
  if (!ticket.resolution_due_at) return undefined;
  const hoursLeft = differenceInHours(
    new Date(ticket.resolution_due_at),
    new Date()
  );
  if (hoursLeft <= 0) return "breached";
  if (hoursLeft <= 4) return "at_risk";
  return "on_track";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy");
}


// ---------------------------------------------------------------------------
// Filter panel sub-component
// ---------------------------------------------------------------------------

interface FilterPanelProps {
  filters: TicketFilters;
  onFilterChange: (patch: Partial<TicketFilters>) => void;
  onClear: () => void;
  onApply: () => void;
  clients: Client[];
  agents: User[];
  categories: Category[];
}

function FilterPanel({
  filters,
  onFilterChange,
  onClear,
  onApply,
  clients,
  agents,
  categories,
}: FilterPanelProps) {
  const toggleStatus = (s: TicketStatus) => {
    const current = filters.status ?? [];
    const next = current.includes(s)
      ? current.filter((x) => x !== s)
      : [...current, s];
    onFilterChange({ status: next.length ? next : undefined });
  };

  const togglePriority = (p: Priority) => {
    const current = filters.priority ?? [];
    const next = current.includes(p)
      ? current.filter((x) => x !== p)
      : [...current, p];
    onFilterChange({ priority: next.length ? next : undefined });
  };

  return (
    <Card className="p-4 space-y-5">
      {/* Status multi-select */}
      <div>
        <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
          Status
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 text-sm text-ink cursor-pointer"
            >
              <Checkbox
                checked={filters.status?.includes(s) ?? false}
                onCheckedChange={() => toggleStatus(s)}
              />
              <span className="capitalize">{s.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Type toggle */}
      <div>
        <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
          Type
        </Label>
        <div className="flex gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={
                (filters.type ?? "incident") === opt.value
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                onFilterChange({
                  type: (filters.type ?? "incident") === opt.value ? undefined : opt.value,
                })
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Priority multi-select */}
      <div>
        <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
          Priority
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {PRIORITIES.map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 text-sm text-ink cursor-pointer"
            >
              <Checkbox
                checked={filters.priority?.includes(p) ?? false}
                onCheckedChange={() => togglePriority(p)}
              />
              <span className="capitalize">{p}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Client dropdown */}
      <div>
        <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
          Client
        </Label>
        <Select
          value={filters.client_id ?? "all"}
          onValueChange={(val) =>
            onFilterChange({ client_id: val === "all" ? undefined : val })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Assigned Agent */}
      <div>
        <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
          Assigned Agent
        </Label>
        <Select
          value={filters.assigned_agent_id ?? "all"}
          onValueChange={(val) =>
            onFilterChange({
              assigned_agent_id: val === "all" ? undefined : val,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.first_name} {a.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Category */}
      <div>
        <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
          Category
        </Label>
        <Select
          value={filters.category_id ?? "all"}
          onValueChange={(val) =>
            onFilterChange({ category_id: val === "all" ? undefined : val })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Date range */}
      <div>
        <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
          Date Range
        </Label>
        <div className="flex flex-col gap-2">
          <Input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) =>
              onFilterChange({
                date_from: e.target.value || undefined,
              })
            }
            placeholder="From"
          />
          <Input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) =>
              onFilterChange({ date_to: e.target.value || undefined })
            }
            placeholder="To"
          />
        </div>
      </div>

      <Separator />

      {/* SLA status */}
      <div>
        <Label className="mb-2 block text-ink-subtle text-xs uppercase tracking-wider">
          SLA Status
        </Label>
        <div className="flex flex-wrap gap-2">
          {SLA_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={
                filters.sla_status === opt.value ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                onFilterChange({
                  sla_status:
                    filters.sla_status === opt.value ? undefined : opt.value,
                })
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onClear} className="flex-1">
          Clear Filters
        </Button>
        <Button size="sm" onClick={onApply} className="flex-1">
          Apply
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Active filter chips
// ---------------------------------------------------------------------------

interface ActiveFiltersProps {
  filters: TicketFilters;
  clients: Client[];
  agents: User[];
  categories: Category[];
  onRemove: (key: keyof TicketFilters, value?: string) => void;
}

function ActiveFilters({
  filters,
  clients,
  agents,
  categories,
  onRemove,
}: ActiveFiltersProps) {
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.status && filters.status.length > 0) {
    filters.status.forEach((s) => {
      chips.push({
        label: `Status: ${s.replace("_", " ")}`,
        onRemove: () => onRemove("status", s),
      });
    });
  }

  if (filters.type) {
    chips.push({
      label: `Type: ${filters.type}`,
      onRemove: () => onRemove("type"),
    });
  }

  if (filters.priority && filters.priority.length > 0) {
    filters.priority.forEach((p) => {
      chips.push({
        label: `Priority: ${p}`,
        onRemove: () => onRemove("priority", p),
      });
    });
  }

  if (filters.client_id) {
    const c = clients.find((x) => x.id === filters.client_id);
    chips.push({
      label: `Client: ${c?.name ?? filters.client_id}`,
      onRemove: () => onRemove("client_id"),
    });
  }

  if (filters.assigned_agent_id) {
    if (filters.assigned_agent_id === "unassigned") {
      chips.push({
        label: "Agent: Unassigned",
        onRemove: () => onRemove("assigned_agent_id"),
      });
    } else {
      const a = agents.find((x) => x.id === filters.assigned_agent_id);
      chips.push({
        label: `Agent: ${a ? `${a.first_name} ${a.last_name}` : filters.assigned_agent_id}`,
        onRemove: () => onRemove("assigned_agent_id"),
      });
    }
  }

  if (filters.category_id) {
    const cat = categories.find((x) => x.id === filters.category_id);
    chips.push({
      label: `Category: ${cat?.name ?? filters.category_id}`,
      onRemove: () => onRemove("category_id"),
    });
  }

  if (filters.sla_status) {
    chips.push({
      label: `SLA: ${filters.sla_status.replace("_", " ")}`,
      onRemove: () => onRemove("sla_status"),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-pill bg-surface-3 px-3 py-1 text-xs text-ink-muted border border-hairline"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="ml-0.5 text-ink-subtle hover:text-ink transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable header
// ---------------------------------------------------------------------------

interface SortHeaderProps {
  column: ColumnDef;
  currentField: SortField;
  currentDir: SortDir;
  onClick: (field: SortField) => void;
}

function SortHeader({ column, currentField, currentDir, onClick }: SortHeaderProps) {
  if (!column.sortable) {
    return (
      <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
        {column.label}
      </th>
    );
  }

  const isActive = currentField === column.key;

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider cursor-pointer select-none hover:text-ik transition-colors"
      onClick={() => onClick(column.key)}
    >
      <div className="flex items-center gap-1">
        <span>{column.label}</span>
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-ink-subtle opacity-50" />
        )}
      </div>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Skeleton table
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-hairline"
        >
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-pill" />
          <Skeleton className="h-5 w-20 rounded-pill" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-24 rounded-pill" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function TicketListPage() {
  const navigate = useNavigate();

  // Data
  const { data: clientsData } = useQuery({
    queryKey: ["clients", "list", { limit: 200 }],
    queryFn: () =>
      api
        .get<PaginatedResponse<Client>>("/clients", {
          params: { limit: 200 },
        })
        .then((r) => r.data.data),
  });
  const { data: agentsData } = useQuery({
    queryKey: ["users", "list", { limit: 200 }],
    queryFn: () =>
      api
        .get<PaginatedResponse<User>>("/users", {
          params: { limit: 200 },
        })
        .then((r) => r.data.data),
  });
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api
        .get<{ data: Category[] }>("/categories")
        .then((r) => r.data.data),
  });

  const clients = clientsData ?? [];
  const agents = agentsData ?? [];
  const categories = categoriesData ?? [];

  // Filter state (local editing)
  const [draftFilters, setDraftFilters] = useState<TicketFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<TicketFilters>({});
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Sort & pagination
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  // Query filters = applied filters + sort + page
  const queryFilters: TicketFilters = useMemo(
    () => ({
      ...appliedFilters,
      sort_by: sortField,
      sort_order: sortDir,
      page,
      limit: PAGE_SIZE,
    }),
    [appliedFilters, sortField, sortDir, page]
  );

  // Ticket fetch
  const {
    data: ticketResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tickets", "list", queryFilters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (appliedFilters.status && appliedFilters.status.length > 0) {
        params.status = appliedFilters.status.join(",");
      }
      if (appliedFilters.type) params.type = appliedFilters.type;
      if (appliedFilters.priority && appliedFilters.priority.length > 0) {
        params.priority = appliedFilters.priority.join(",");
      }
      if (appliedFilters.client_id) params.client_id = appliedFilters.client_id;
      if (appliedFilters.assigned_agent_id)
        params.assigned_agent_id = appliedFilters.assigned_agent_id;
      if (appliedFilters.category_id)
        params.category_id = appliedFilters.category_id;
      if (appliedFilters.date_from) params.date_from = appliedFilters.date_from;
      if (appliedFilters.date_to) params.date_to = appliedFilters.date_to;
      if (appliedFilters.sla_status)
        params.sla_status = appliedFilters.sla_status;
      params.sort_by = sortField;
      params.sort_order = sortDir;
      params.page = String(page);
      params.limit = String(PAGE_SIZE);

      const { data } = await api.get<PaginatedResponse<Ticket>>("/tickets", {
        params,
      });
      return data;
    },
  });

  const tickets = ticketResponse?.data ?? [];
  const totalPages = ticketResponse?.totalPages ?? 1;
  const total = ticketResponse?.total ?? 0;

  // Handlers
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortField]
  );

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  }, [draftFilters]);

  const clearFilters = useCallback(() => {
    setDraftFilters({});
    setAppliedFilters({});
    setPage(1);
  }, []);

  const removeFilter = useCallback(
    (key: keyof TicketFilters, value?: string) => {
      const next = { ...appliedFilters };
      if (key === "status" && value && Array.isArray(next.status)) {
        next.status = next.status.filter((s) => s !== value);
        if (next.status.length === 0) delete next.status;
      } else if (key === "priority" && value && Array.isArray(next.priority)) {
        next.priority = next.priority.filter((p) => p !== value);
        if (next.priority.length === 0) delete next.priority;
      } else {
        delete next[key];
      }
      setDraftFilters(next);
      setAppliedFilters(next);
      setPage(1);
    },
    [appliedFilters]
  );

  // Pagination range
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-ink">Tickets</h1>
          {!isLoading && (
            <span className="text-sm text-ink-subtle">{total} total</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterPanelOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Filters
          </Button>
          <Button size="sm" onClick={() => navigate("/tickets/new")}>
            <Plus className="h-4 w-4 mr-1" />
            New Ticket
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Filter panel */}
        {filterPanelOpen && (
          <div className="w-72 shrink-0 border-r border-hairline overflow-y-auto scrollbar-dark p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-ink">Filters</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterPanelOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <FilterPanel
              filters={draftFilters}
              onFilterChange={(patch) =>
                setDraftFilters((f) => ({ ...f, ...patch }))
              }
              onClear={clearFilters}
              onApply={applyFilters}
              clients={clients}
              agents={agents}
              categories={categories}
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active filter chips */}
          <div className="px-6 py-2">
            <ActiveFilters
              filters={appliedFilters}
              clients={clients}
              agents={agents}
              categories={categories}
              onRemove={removeFilter}
            />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto scrollbar-dark">
            {isLoading ? (
              <div className="px-6 pt-4">
                <TableSkeleton />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
                <div className="rounded-pill bg-semantic-danger/10 p-4 mb-4">
                  <AlertCircle className="h-8 w-8 text-semantic-danger" />
                </div>
                <h3 className="text-base font-medium text-ink mb-1">
                  Failed to load tickets
                </h3>
                <p className="text-sm text-ink-subtle mb-4 max-w-xs">
                  {error instanceof Error
                    ? error.message
                    : "An unexpected error occurred. Please try again."}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
                <div className="rounded-pill bg-surface-3 p-4 mb-4">
                  <TicketIcon className="h-8 w-8 text-ink-subtle" />
                </div>
                <h3 className="text-base font-medium text-ink mb-1">
                  No tickets found
                </h3>
                <p className="text-sm text-ink-subtle mb-4 max-w-xs">
                  {Object.keys(appliedFilters).length > 0
                    ? "Try adjusting your filters to see more results."
                    : "Get started by creating your first ticket."}
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/tickets/new")}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Ticket
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-canvas">
                  <tr className="border-b border-hairline">
                    {COLUMNS.map((col, i) => (
                      <SortHeader
                        key={i}
                        column={col}
                        currentField={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const slaStatus = getSlaStatus(ticket);
                    return (
                      <tr
                        key={ticket.id}
                        className={cn(
                          "group border-b border-hairline transition-colors hover:bg-surface-2 cursor-pointer",
                          priorityBorder(ticket.priority),
                          "border-l-2"
                        )}
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-primary">
                            {ticket.ticket_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[240px]">
                          <span className="text-sm text-ink truncate block">
                            {ticket.title}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-ink-muted">
                            {/* Client name would need a join query; show client_id as fallback */}
                            {clients.find((c) => c.id === ticket.client_id)
                              ?.name ?? ticket.client_id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-pill",
                                priorityDot(ticket.priority)
                              )}
                            />
                            <span className="text-sm capitalize text-ink-muted">
                              {ticket.priority}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadgeVariant(ticket.status)}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {ticket.assigned_agent_id ? (
                            <span className="text-sm text-ink-muted">
                              {agents.find(
                                (a) => a.id === ticket.assigned_agent_id
                              )
                                ? `${agents.find((a) => a.id === ticket.assigned_agent_id)!.first_name} ${agents.find((a) => a.id === ticket.assigned_agent_id)!.last_name}`
                                : ticket.assigned_agent_id.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-sm text-ink-subtle italic">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-ink-muted">
                            {formatDate(ticket.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-block text-xs font-medium px-2 py-0.5 rounded-pill",
                              slaVariant(slaStatus)
                            )}
                          >
                            {slaStatus === "breached"
                              ? "Breached"
                              : slaStatus === "at_risk"
                                ? "At Risk"
                                : slaStatus === "on_track"
                                  ? "On Track"
                                  : "N/A"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && !isError && tickets.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-hairline bg-surface-1">
              <span className="text-sm text-ink-subtle">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageNumbers.map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPage(p)}
                    className="min-w-[32px]"
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
