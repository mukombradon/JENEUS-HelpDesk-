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
  BookOpen,
  FileText,
  Eye,
  ThumbsUp,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import type { KnowledgeArticle, PaginatedResponse } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 12;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy");
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KBListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch categories for tabs
  const { data: categoriesData } = useQuery({
    queryKey: ["kb", "categories"],
    queryFn: () =>
      api.get<{ id: string; name: string }[]>("/kb/categories").then((r) => r.data),
  });
  const categories = categoriesData ?? [];

  // Fetch articles
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["kb", "articles", { page, search, category: categoryFilter, limit: PAGE_SIZE }],
    queryFn: () => {
      const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
      if (search) params.search = search;
      if (categoryFilter && categoryFilter !== "all") params.category_id = categoryFilter;
      return api
        .get<PaginatedResponse<KnowledgeArticle>>("/kb/articles", { params })
        .then((r) => r.data);
    },
  });

  const articles = data?.data ?? [];
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
          <BookOpen className="h-5 w-5 text-ink-subtle" />
          <h1 className="text-lg font-semibold text-ink">Knowledge Base</h1>
          {!isLoading && (
            <span className="text-sm text-ink-subtle">{total} articles</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate("/knowledge-base/new")}>
            <Plus className="h-4 w-4 mr-1" />
            New Article
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
            placeholder="Search articles..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-6 py-3 border-b border-hairline">
        <Tabs
          value={categoryFilter}
          onValueChange={(val) => {
            setCategoryFilter(val);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-6">
        {isLoading ? (
          <CardGridSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
            <div className="rounded-pill bg-semantic-danger/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-semantic-danger" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">
              Failed to load articles
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
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
            <div className="rounded-pill bg-surface-3 p-4 mb-4">
              <FileText className="h-8 w-8 text-ink-subtle" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">
              No articles found
            </h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              {search
                ? "Try a different search term."
                : "Get started by writing your first article."}
            </p>
            <Button size="sm" onClick={() => navigate("/knowledge-base/new")}>
              <Plus className="h-4 w-4 mr-1" />
              New Article
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article) => (
              <Card
                key={article.id}
                className="cursor-pointer hover:bg-surface-2 transition-colors"
                onClick={() => navigate(`/knowledge-base/${article.id}`)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-ink leading-snug line-clamp-2">
                      {article.title}
                    </h3>
                    {!article.is_published && (
                      <Badge variant="warning" className="shrink-0">
                        Draft
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted line-clamp-3 leading-relaxed">
                    {article.content
                      ? article.content.replace(/<[^>]*>/g, "").slice(0, 200)
                      : "No description available."}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-ink-subtle pt-1">
                    {article.category_id && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {article.category_id.slice(0, 8)}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.view_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {article.helpful_count ?? 0}
                    </span>
                    <span>{formatDate(article.updated_at || article.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && articles.length > 0 && (
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
