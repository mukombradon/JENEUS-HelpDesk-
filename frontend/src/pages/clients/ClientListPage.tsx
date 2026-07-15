import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Building2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import type { Client, PaginatedResponse } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

function contractTierVariant(
  tier: string
): "default" | "success" | "warning" | "secondary" {
  switch (tier) {
    case "enterprise":
      return "default";
    case "premium":
      return "success";
    case "standard":
      return "warning";
    default:
      return "secondary";
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy");
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-hairline"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded-pill" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-14 rounded-pill" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ClientListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["clients", "list", { page, search, limit: PAGE_SIZE }],
    queryFn: () =>
      api
        .get<PaginatedResponse<Client>>("/clients", {
          params: { page, limit: PAGE_SIZE, search: search || undefined },
        })
        .then((r) => r.data),
  });

  const clients = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-ink">Clients</h1>
          {!isLoading && (
            <span className="text-sm text-ink-subtle">{total} total</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate("/clients/new")}>
            <Plus className="h-4 w-4 mr-1" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-hairline">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search clients..."
            className="pl-9"
          />
        </div>
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
              Failed to load clients
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
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
            <div className="rounded-pill bg-surface-3 p-4 mb-4">
              <Building2 className="h-8 w-8 text-ink-subtle" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">
              No clients found
            </h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              {search
                ? "Try a different search term."
                : "Get started by adding your first client."}
            </p>
            <Button size="sm" onClick={() => navigate("/clients/new")}>
              <Plus className="h-4 w-4 mr-1" />
              Add Client
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-canvas">
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Contract Tier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Primary Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Active
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Tickets
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="group border-b border-hairline transition-colors hover:bg-surface-2 cursor-pointer"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-ink">
                      {client.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-ink-muted">
                      {client.industry || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={contractTierVariant(client.contract_tier)}>
                      {client.contract_tier}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-ink-muted">
                      {client.primary_contact_id
                        ? client.primary_contact_id.slice(0, 8)
                        : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={client.is_active ? "success" : "secondary"}
                    >
                      {client.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-ink-muted">-</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-ink-muted">
                      {formatDate(client.created_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && clients.length > 0 && (
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
  );
}
