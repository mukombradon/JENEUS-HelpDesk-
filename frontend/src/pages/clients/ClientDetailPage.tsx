import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Briefcase,
  Shield,
  User,
  Calendar,
  Phone,
  Mail,
  Star,
  Plus,
  ExternalLink,
  AlertCircle,
  Users,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";
import type {
  Client,
  ClientContact,
  Ticket,
  PaginatedResponse,
  User as Agent,
} from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return format(new Date(dateStr), "MMM d, yyyy");
}

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

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-6 w-20 rounded-pill" />
        <Skeleton className="h-6 w-16 rounded-pill" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Contact Dialog
// ---------------------------------------------------------------------------

function AddContactDialog({
  clientId,
  onSuccess,
}: {
  clientId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [portalAccess, setPortalAccess] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: "Validation error", description: "Name and email are required.", variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/clients/${clientId}/contacts`, {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        role,
        is_primary: isPrimary,
        portal_access: portalAccess,
      });
      toast({ title: "Contact added", variant: "success" });
      setOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setRole("");
      setIsPrimary(false);
      setPortalAccess(true);
      onSuccess();
    } catch {
      toast({ title: "Error", description: "Failed to add contact.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. IT Manager"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="cursor-pointer">Primary Contact</Label>
            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="cursor-pointer">Portal Access</Label>
            <Switch checked={portalAccess} onCheckedChange={setPortalAccess} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch client
  const {
    data: client,
    isLoading: clientLoading,
    isError: clientError,
  } = useQuery({
    queryKey: ["clients", "detail", id],
    queryFn: () => api.get<Client>(`/clients/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  // Fetch contacts
  const {
    data: contacts = [],
    refetch: refetchContacts,
  } = useQuery({
    queryKey: ["clients", "contacts", id],
    queryFn: () =>
      api.get<ClientContact[]>(`/clients/${id}/contacts`).then((r) => r.data),
    enabled: !!id,
  });

  // Fetch agents (for account manager)
  const { data: agentsData } = useQuery({
    queryKey: ["users", "list", { limit: 200 }],
    queryFn: () =>
      api
        .get<PaginatedResponse<Agent>>("/users", { params: { limit: 200 } })
        .then((r) => r.data.data),
  });
  const agents = agentsData ?? [];

  // Fetch last 10 tickets for this client
  const { data: ticketsResponse } = useQuery({
    queryKey: ["clients", "tickets", id],
    queryFn: () =>
      api
        .get<PaginatedResponse<Ticket>>("/tickets", {
          params: { client_id: id, limit: 10, sort_by: "created_at", sort_order: "desc" },
        })
        .then((r) => r.data),
    enabled: !!id,
  });

  const tickets = ticketsResponse?.data ?? [];

  const accountManager = client?.account_manager_id
    ? agents.find((a) => a.id === client.account_manager_id)
    : null;

  // Loading state
  if (clientLoading) {
    return <DetailSkeleton />;
  }

  // Error state
  if (clientError || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-24">
        <div className="rounded-pill bg-surface-3 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-semantic-danger" />
        </div>
        <h2 className="text-lg font-semibold text-ink mb-1">
          Client not found
        </h2>
        <p className="text-sm text-ink-subtle mb-6 max-w-sm">
          The client you're looking for doesn't exist or you don't have
          permission to view it.
        </p>
        <Button variant="outline" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-ink">{client.name}</h1>
          <Badge variant={contractTierVariant(client.contract_tier)}>
            {client.contract_tier}
          </Badge>
          <Badge variant={client.is_active ? "success" : "secondary"}>
            {client.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-6 space-y-6">
        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">
                  Industry
                </p>
                <p className="text-sm text-ink font-medium">
                  {client.industry || "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">
                  SLA Policy
                </p>
                <p className="text-sm text-ink font-medium">
                  {client.sla_policy_id ? client.sla_policy_id.slice(0, 8) : "None"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">
                  Account Manager
                </p>
                <p className="text-sm text-ink font-medium">
                  {accountManager
                    ? `${accountManager.first_name} ${accountManager.last_name}`
                    : "Unassigned"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-ink-subtle uppercase tracking-wider mb-1">
                  Created
                </p>
                <p className="text-sm text-ink font-medium">
                  {formatDate(client.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Contacts section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-ink-subtle" />
              <h2 className="text-sm font-medium text-ink">
                Contacts ({contacts.length})
              </h2>
            </div>
            <AddContactDialog
              clientId={client.id}
              onSuccess={() => refetchContacts()}
            />
          </div>

          {contacts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-8 w-8 text-ink-subtle mx-auto mb-2" />
                <p className="text-sm text-ink-muted">
                  No contacts found for this client.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-subtle uppercase tracking-wider">
                      Primary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="border-b border-hairline hover:bg-surface-2 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm text-ink">
                          {contact.first_name} {contact.last_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-ink-muted flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-ink-muted flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-ink-muted">
                          {contact.role || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {contact.is_primary ? (
                          <Badge variant="success">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        ) : (
                          <span className="text-sm text-ink-subtle">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Separator />

        {/* Ticket history */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-medium text-ink">
              Recent Tickets ({tickets.length})
            </h2>
          </div>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-ink-muted">
                  No tickets found for this client.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 rounded-md bg-surface-1 border border-hairline hover:bg-surface-2 transition-colors cursor-pointer"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-primary">
                      {ticket.ticket_number}
                    </span>
                    <span className="text-sm text-ink">{ticket.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
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
                    >
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-ink-subtle" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
