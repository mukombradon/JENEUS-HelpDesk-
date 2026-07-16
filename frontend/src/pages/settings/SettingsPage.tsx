import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  UserCog,
  Users,
  Building2,
  FolderTree,
  Shield,
  Mail,
  Ticket,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
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
import { Switch } from "../../components/ui/switch";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";
import type { User, Team, Category, Client, SLAPolicy, PaginatedResponse } from "../../types";

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------

type SettingsTab =
  | "general"
  | "users"
  | "teams"
  | "clients"
  | "categories"
  | "sla"
  | "email"
  | "ticket";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "users", label: "Users", icon: UserCog },
  { id: "teams", label: "Teams", icon: Users },
  { id: "clients", label: "Clients", icon: Building2 },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "sla", label: "SLA", icon: Shield },
  { id: "email", label: "Email", icon: Mail },
  { id: "ticket", label: "Ticket", icon: Ticket },
];

// ---------------------------------------------------------------------------
// General Settings Tab
// ---------------------------------------------------------------------------

function GeneralTab() {
  const [appName, setAppName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MMM d, yyyy");
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", "general"],
    queryFn: () => api.get<Record<string, string>>("/settings/general").then((r) => r.data),
  });

  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name ?? "JENEUS HelpDesk");
      setTimezone(settings.timezone ?? "UTC");
      setDateFormat(settings.date_format ?? "MMM d, yyyy");
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/general", {
        app_name: appName,
        timezone,
        date_format: dateFormat,
      });
      toast({ title: "Settings saved", variant: "success" });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-1.5">
        <Label>Application Name</Label>
        <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTC">UTC</SelectItem>
            <SelectItem value="US/Eastern">US/Eastern</SelectItem>
            <SelectItem value="US/Central">US/Central</SelectItem>
            <SelectItem value="US/Mountain">US/Mountain</SelectItem>
            <SelectItem value="US/Pacific">US/Pacific</SelectItem>
            <SelectItem value="Europe/London">Europe/London</SelectItem>
            <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
            <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Date Format</Label>
        <Select value={dateFormat} onValueChange={setDateFormat}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MMM d, yyyy">Jan 1, 2024</SelectItem>
            <SelectItem value="yyyy-MM-dd">2024-01-01</SelectItem>
            <SelectItem value="dd/MM/yyyy">01/01/2024</SelectItem>
            <SelectItem value="MM/dd/yyyy">01/01/2024</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-1" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------

function UsersTab() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings", "users"],
    queryFn: () =>
      api.get<PaginatedResponse<User>>("/users", { params: { limit: 200 } }).then((r) => r.data),
  });
  const users = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertCircle className="h-8 w-8 text-semantic-danger mb-2" />
        <p className="text-sm text-ink-subtle mb-3">Failed to load users.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-subtle">{users.length} users</p>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Invite User
        </Button>
      </div>
      {users.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-ink-muted">
            No users found.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-hairline hover:bg-surface-2">
                  <td className="px-4 py-3 text-sm text-ink">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.is_active ? "success" : "secondary"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teams Tab
// ---------------------------------------------------------------------------

function TeamsTab() {
  const { data: teams, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings", "teams"],
    queryFn: () => api.get<Team[]>("/teams").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertCircle className="h-8 w-8 text-semantic-danger mb-2" />
        <p className="text-sm text-ink-subtle mb-3">Failed to load teams.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-subtle">{(teams ?? []).length} teams</p>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Team
        </Button>
      </div>
      {(teams ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-ink-muted">
            No teams configured.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(teams ?? []).map((team) => (
            <Card key={team.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{team.name}</p>
                  <p className="text-xs text-ink-muted">
                    {team.description || "No description"}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clients Tab
// ---------------------------------------------------------------------------

function ClientsTab() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings", "clients"],
    queryFn: () =>
      api.get<PaginatedResponse<Client>>("/clients", { params: { limit: 200 } }).then((r) => r.data),
  });
  const clients = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertCircle className="h-8 w-8 text-semantic-danger mb-2" />
        <p className="text-sm text-ink-subtle mb-3">Failed to load clients.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-subtle">{clients.length} clients</p>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Client
        </Button>
      </div>
      {clients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-ink-muted">
            No clients found.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">Tier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">Active</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-hairline hover:bg-surface-2">
                  <td className="px-4 py-3 text-sm text-ink">{client.name}</td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{client.industry || "-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={client.contract_tier === "enterprise" ? "default" : client.contract_tier === "premium" ? "success" : "secondary"}>
                      {client.contract_tier}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={client.is_active ? "success" : "secondary"}>
                      {client.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Categories Tab
// ---------------------------------------------------------------------------

function CategoriesTab() {
  const { data: categories, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings", "categories"],
    queryFn: () =>
      api
        .get<{ data: Category[] }>("/categories")
        .then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertCircle className="h-8 w-8 text-semantic-danger mb-2" />
        <p className="text-sm text-ink-subtle mb-3">Failed to load categories.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-subtle">{(categories ?? []).length} categories</p>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </div>
      {(categories ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-ink-muted">
            No categories configured.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(categories ?? []).map((cat) => (
            <Card key={cat.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{cat.name}</p>
                  {cat.icon && (
                    <p className="text-xs text-ink-muted">{cat.icon}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-semantic-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLA Tab
// ---------------------------------------------------------------------------

function SLATab() {
  const { data: slaPolicies, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings", "sla"],
    queryFn: () => api.get<SLAPolicy[]>("/sla-policies").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12">
        <AlertCircle className="h-8 w-8 text-semantic-danger mb-2" />
        <p className="text-sm text-ink-subtle mb-3">Failed to load SLA policies.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-subtle">{(slaPolicies ?? []).length} policies</p>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Policy
        </Button>
      </div>
      {(slaPolicies ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-ink-muted">
            No SLA policies configured.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(slaPolicies ?? []).map((policy) => (
            <Card key={policy.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-ink">{policy.name}</p>
                  <Badge variant={policy.business_hours_only ? "warning" : "secondary"}>
                    {policy.business_hours_only ? "Business Hours" : "24/7"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-muted">
                  <span>{policy.rules.length} rule(s)</span>
                  {policy.description && <span>{policy.description}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email Tab
// ---------------------------------------------------------------------------

function EmailTab() {
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [fromName, setFromName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", "email"],
    queryFn: () => api.get<Record<string, string>>("/settings/email").then((r) => r.data),
  });

  useEffect(() => {
    if (settings) {
      setSmtpHost(settings.smtp_host ?? "");
      setSmtpPort(settings.smtp_port ?? "587");
      setSmtpUser(settings.smtp_user ?? "");
      setFromAddress(settings.from_address ?? "");
      setFromName(settings.from_name ?? "");
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/email", {
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
        from_address: fromAddress,
        from_name: fromName,
      });
      toast({ title: "Email settings saved", variant: "success" });
    } catch {
      toast({ title: "Error", description: "Failed to save email settings.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>SMTP Host</Label>
          <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>SMTP Port</Label>
          <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>SMTP Username</Label>
        <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>SMTP Password</Label>
        <Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>From Address</Label>
          <Input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="noreply@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>From Name</Label>
          <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="JENEUS HelpDesk" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        <Button variant="outline" disabled>
          Test Connection
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ticket Settings Tab
// ---------------------------------------------------------------------------

function TicketTab() {
  const [defaultPriority, setDefaultPriority] = useState("medium");
  const [autoAssign, setAutoAssign] = useState(true);
  const [requireSla, setRequireSla] = useState(true);
  const [allowPortalCreation, setAllowPortalCreation] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", "ticket"],
    queryFn: () => api.get<Record<string, unknown>>("/settings/ticket").then((r) => r.data),
  });

  useEffect(() => {
    if (settings) {
      setDefaultPriority((settings.default_priority as string) ?? "medium");
      setAutoAssign((settings.auto_assign as boolean) ?? true);
      setRequireSla((settings.require_sla as boolean) ?? true);
      setAllowPortalCreation((settings.allow_portal_creation as boolean) ?? true);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/ticket", {
        default_priority: defaultPriority,
        auto_assign: autoAssign,
        require_sla: requireSla,
        allow_portal_creation: allowPortalCreation,
      });
      toast({ title: "Ticket settings saved", variant: "success" });
    } catch {
      toast({ title: "Error", description: "Failed to save ticket settings.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-1.5">
        <Label>Default Priority</Label>
        <Select value={defaultPriority} onValueChange={setDefaultPriority}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label className="cursor-pointer">Auto-assign tickets</Label>
        <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="cursor-pointer">Require SLA policy</Label>
        <Switch checked={requireSla} onCheckedChange={setRequireSla} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="cursor-pointer">Allow portal ticket creation</Label>
        <Switch checked={allowPortalCreation} onCheckedChange={setAllowPortalCreation} />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-1" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL hash or default to "general"
  const activeTab: SettingsTab = (location.hash.slice(1) as SettingsTab) || "general";

  const setActiveTab = (tab: SettingsTab) => {
    navigate(`/settings#${tab}`, { replace: true });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralTab />;
      case "users":
        return <UsersTab />;
      case "teams":
        return <TeamsTab />;
      case "clients":
        return <ClientsTab />;
      case "categories":
        return <CategoriesTab />;
      case "sla":
        return <SLATab />;
      case "email":
        return <EmailTab />;
      case "ticket":
        return <TicketTab />;
      default:
        return <GeneralTab />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-hairline">
        <Settings className="h-5 w-5 text-ink-subtle" />
        <h1 className="text-lg font-semibold text-ink">Settings</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar tabs */}
        <div className="w-52 border-r border-hairline bg-surface-1 flex-shrink-0 overflow-y-auto scrollbar-dark">
          <nav className="p-2 space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto scrollbar-dark p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
