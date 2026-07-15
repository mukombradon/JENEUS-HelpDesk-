import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import AgentDashboard from "./AgentDashboard";
import ManagementDashboard from "./ManagementDashboard";
import type { Role } from "../../types";

// ---------------------------------------------------------------------------
// Roles that see the management / admin dashboard
// ---------------------------------------------------------------------------

const MANAGEMENT_ROLES: Role[] = ["admin", "super_admin", "team_lead"];

// ---------------------------------------------------------------------------
// DashboardPage — router wrapper that checks user role
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If no user loaded yet (e.g. still fetching profile), show a minimal loader
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline-strong border-t-primary" />
          <p className="text-sm text-ink-subtle">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Route based on role
  if (MANAGEMENT_ROLES.includes(user.role)) {
    return <ManagementDashboard />;
  }

  // Default: agent dashboard
  return <AgentDashboard />;
}
