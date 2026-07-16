import { useEffect } from "react";
import { Navigate, Outlet, Routes, Route } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import AppLayout from "./components/layout/AppLayout";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Dashboard
import DashboardPage from "./pages/dashboard/DashboardPage";

// Tickets
import TicketListPage from "./pages/tickets/TicketListPage";
import CreateTicketPage from "./pages/tickets/CreateTicketPage";
import TicketDetailPage from "./pages/tickets/TicketDetailPage";
import EditTicketPage from "./pages/tickets/EditTicketPage";

// Clients
import ClientListPage from "./pages/clients/ClientListPage";
import ClientDetailPage from "./pages/clients/ClientDetailPage";

// Knowledge Base
import KBListPage from "./pages/knowledge-base/KBListPage";
import KBArticlePage from "./pages/knowledge-base/KBArticlePage";

// Reports
import ReportsPage from "./pages/reports/ReportsPage";

// Settings
import SettingsPage from "./pages/settings/SettingsPage";

// Portal
import PortalLoginPage from "./pages/portal/PortalLoginPage";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalCreateTicket from "./pages/portal/PortalCreateTicket";
import PortalTicketDetail from "./pages/portal/PortalTicketDetail";

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

/** Redirects unauthenticated users to /login */
function ProtectedRoute({ requiredRole }: { requiredRole?: string }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role check (optional)
  if (requiredRole && user?.role !== requiredRole && user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/** Redirects users without a portal token to /portal */
function ProtectedPortalRoute() {
  const token = localStorage.getItem("portal_access_token");

  if (!token) {
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
}

/** If the user is already logged in, skip login pages and go to dashboard */
function PublicRoute() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Show a full-screen loading spinner while validating the stored token
  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline-strong border-t-primary" />
          <p className="text-sm text-ink-subtle">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Routes>
        {/* ===== Public auth routes ===== */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Route>

        {/* ===== Authenticated routes (with sidebar + navbar) ===== */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Tickets */}
            <Route path="/tickets" element={<TicketListPage />} />
            <Route path="/tickets/new" element={<CreateTicketPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/tickets/:id/edit" element={<EditTicketPage />} />

            {/* Clients */}
            <Route path="/clients" element={<ClientListPage />} />
            <Route path="/clients/new" element={<div>New Client</div>} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />

            {/* Knowledge Base */}
            <Route path="/knowledge-base" element={<KBListPage />} />
            <Route path="/knowledge-base/new" element={<div>New Article</div>} />
            <Route path="/knowledge-base/:id" element={<KBArticlePage />} />
            <Route
              path="/knowledge-base/:id/edit"
              element={<div>Edit Article</div>}
            />

            {/* Reports */}
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/sla" element={<div>SLA Report</div>} />
            <Route path="/reports/volume" element={<div>Volume Report</div>} />
            <Route path="/reports/agents" element={<div>Agent Report</div>} />
            <Route path="/reports/problems" element={<div>Problem Report</div>} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/general" element={<div>General Settings</div>} />
            <Route path="/settings/users" element={<div>User Management</div>} />
            <Route path="/settings/teams" element={<div>Team Management</div>} />
            <Route path="/settings/clients" element={<div>Client Management</div>} />
            <Route
              path="/settings/categories"
              element={<div>Category Management</div>}
            />
            <Route path="/settings/sla" element={<div>SLA Management</div>} />
            <Route path="/settings/email" element={<div>Email Settings</div>} />
            <Route path="/settings/portal" element={<div>Portal Settings</div>} />

            {/* Profile & Notifications */}
            <Route path="/profile" element={<div>My Profile</div>} />
            <Route path="/notifications" element={<div>Notifications</div>} />

            {/* Problems */}
            <Route path="/problems" element={<div>Problems List</div>} />
            <Route path="/problems/new" element={<div>New Problem</div>} />
            <Route path="/problems/:id" element={<div>Problem Detail</div>} />
          </Route>
        </Route>

        {/* ===== Client Portal routes ===== */}
        <Route path="/portal" element={<PortalLoginPage />} />

        <Route element={<ProtectedPortalRoute />}>
          <Route path="/portal/dashboard" element={<PortalDashboard />} />
          <Route path="/portal/tickets/new" element={<PortalCreateTicket />} />
          <Route path="/portal/tickets/:id" element={<PortalTicketDetail />} />
          <Route path="/portal/profile" element={<div>Portal Profile</div>} />
        </Route>

        {/* ===== Default redirects ===== */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </div>
  );
}
