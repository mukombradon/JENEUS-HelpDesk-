import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent } from "../../components/ui/card";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/portal/auth/login", {
        email,
        password,
      });
      // Portal auth returns a token and user info
      const { access_token } = response.data;
      // Store portal token
      localStorage.setItem("portal_access_token", access_token);
      toast({ title: "Welcome to the Client Portal", variant: "success" });
      navigate("/portal/dashboard");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data?.message
          : "Login failed. Please check your credentials.";
      setError(message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b0e] to-[#14161a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4">
            <img
              src="/logo.jpeg"
              alt="JENEUS"
              className="w-16 h-16 rounded-xl object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-ink">Client Portal</h1>
          <p className="text-sm text-ink-muted mt-1">
            Sign in to track and manage your support tickets
          </p>
        </div>

        {/* Login card */}
        <Card className="border-hairline/60">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error alert */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-semantic-danger/10 border border-semantic-danger/20">
                  <AlertCircle className="h-4 w-4 text-semantic-danger shrink-0 mt-0.5" />
                  <p className="text-xs text-semantic-danger">{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="portal-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                  <Input
                    id="portal-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="portal-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
                  <Input
                    id="portal-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-9 pr-9"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back to main */}
        <p className="text-center mt-6">
          <button
            onClick={() => navigate("/login")}
            className="text-xs text-ink-muted hover:text-ink transition-colors"
          >
            Agent login
          </button>
        </p>
      </div>
    </div>
  );
}
