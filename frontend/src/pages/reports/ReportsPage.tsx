import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart3,
  Clock,
  Users,
  AlertTriangle,
  Download,
  Calendar,
  RefreshCw,
  AlertCircle,
  FileText,
  CheckCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORT_CARDS: ReportCard[] = [
  {
    id: "sla",
    title: "SLA Report",
    description: "View SLA compliance metrics, breach rates, and response time averages across all tickets.",
    icon: Clock,
    route: "/reports/sla",
    color: "text-primary",
  },
  {
    id: "volume",
    title: "Volume Report",
    description: "Track ticket creation trends, peak periods, and volume distribution by category.",
    icon: BarChart3,
    route: "/reports/volume",
    color: "text-semantic-success",
  },
  {
    id: "agents",
    title: "Agent Report",
    description: "Agent performance metrics including resolution times, ticket counts, and customer satisfaction.",
    icon: Users,
    route: "/reports/agents",
    color: "text-semantic-warning",
  },
  {
    id: "problems",
    title: "Problem Report",
    description: "Recurring issues, root cause analysis, and problem resolution effectiveness.",
    icon: AlertTriangle,
    route: "/reports/problems",
    color: "text-semantic-danger",
  },
];

const DATE_PRESETS = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Custom Range", value: "custom" },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const navigate = useNavigate();
  const [datePreset, setDatePreset] = useState("30d");
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exportEnabled, setExportEnabled] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Compute actual date range based on preset
  const getDateParams = () => {
    if (datePreset === "custom") {
      return { start_date: startDate, end_date: endDate };
    }
    const now = new Date();
    let start: Date;
    switch (datePreset) {
      case "7d":
        start = subDays(now, 7);
        break;
      case "90d":
        start = subDays(now, 90);
        break;
      case "this_month":
        start = startOfMonth(now);
        break;
      case "last_month":
        start = startOfMonth(subDays(startOfMonth(now), 1));
        return {
          start_date: format(start, "yyyy-MM-dd"),
          end_date: format(endOfMonth(start), "yyyy-MM-dd"),
        };
      default:
        start = subDays(now, 30);
    }
    return { start_date: format(start, "yyyy-MM-dd"), end_date: format(now, "yyyy-MM-dd") };
  };

  // Fetch summary data
  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports", "summary", datePreset, startDate, endDate],
    queryFn: () => {
      const params = getDateParams();
      return api
        .get<{
          total_tickets: number;
          resolved_tickets: number;
          avg_resolution_time: string;
          sla_breaches: number;
          active_agents: number;
          open_tickets: number;
        }>("/reports/summary", { params })
        .then((r) => r.data);
    },
  });

  // Handle export
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = getDateParams();
      const response = await api.get("/reports/export", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report-${format(new Date(), "yyyy-MM-dd")}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Report exported", variant: "success" });
    } catch {
      toast({ title: "Error", description: "Failed to export report.", variant: "error" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-ink-subtle" />
          <h1 className="text-lg font-semibold text-ink">Reports</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="export-toggle" className="text-xs text-ink-subtle cursor-pointer">
              Export Mode
            </Label>
            <Switch
              id="export-toggle"
              checked={exportEnabled}
              onCheckedChange={setExportEnabled}
            />
          </div>
          {exportEnabled && (
            <Button size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-1" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          )}
        </div>
      </div>

      {/* Date range selector */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-hairline">
        <Calendar className="h-4 w-4 text-ink-subtle" />
        <Select value={datePreset} onValueChange={setDatePreset}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {datePreset === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-2 border border-hairline rounded-md px-2 py-1 text-sm text-ink"
            />
            <span className="text-ink-subtle">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-2 border border-hairline rounded-md px-2 py-1 text-sm text-ink"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-6 space-y-6">
        {/* Summary cards */}
        {isLoading ? (
          <SummarySkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="rounded-pill bg-semantic-danger/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-semantic-danger" />
            </div>
            <h3 className="text-base font-medium text-ink mb-1">
              Failed to load report data
            </h3>
            <p className="text-sm text-ink-subtle mb-4 max-w-xs">
              An error occurred while fetching report data.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">
                    Total Tickets
                  </p>
                  <p className="text-2xl font-semibold text-ink">
                    {summary?.total_tickets ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="rounded-md bg-semantic-success/10 p-2">
                  <CheckCircle className="h-4 w-4 text-semantic-success" />
                </div>
                <div>
                  <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">
                    Resolved
                  </p>
                  <p className="text-2xl font-semibold text-ink">
                    {summary?.resolved_tickets ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="rounded-md bg-semantic-warning/10 p-2">
                  <Clock className="h-4 w-4 text-semantic-warning" />
                </div>
                <div>
                  <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">
                    Avg Resolution
                  </p>
                  <p className="text-2xl font-semibold text-ink">
                    {summary?.avg_resolution_time ?? "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="rounded-md bg-semantic-danger/10 p-2">
                  <AlertTriangle className="h-4 w-4 text-semantic-danger" />
                </div>
                <div>
                  <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">
                    SLA Breaches
                  </p>
                  <p className="text-2xl font-semibold text-ink">
                    {summary?.sla_breaches ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Separator />

        {/* Report type cards */}
        <div>
          <h2 className="text-sm font-medium text-ink mb-4">Report Types</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REPORT_CARDS.map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer hover:bg-surface-2 transition-colors"
                onClick={() => navigate(report.route)}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="rounded-md bg-surface-2 p-2.5 shrink-0">
                    <report.icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-ink mb-1">
                      {report.title}
                    </h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
