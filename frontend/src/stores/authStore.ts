import { create } from "zustand";
import { auth } from "../lib/api";
import { deepCamelToSnake } from "../lib/utils";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  login: (email: string, password: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem("accessToken"),
  isAuthenticated: !!localStorage.getItem("accessToken"),
  isInitializing: !!localStorage.getItem("accessToken"),
  isLoading: false,
  error: null,

  setAuth: (user: User, token: string) => {
    localStorage.setItem("accessToken", token);
    set({
      user,
      accessToken: token,
      isAuthenticated: true,
      isInitializing: false,
      error: null,
    });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false,
      error: null,
    });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1"}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Login failed. Please try again.");
      }
      const data = await response.json();
      const normalized = deepCamelToSnake(data);
      const { user, accessToken } = normalized;
      localStorage.setItem("accessToken", accessToken);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      set({
        user,
        accessToken,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isInitializing: false,
        isLoading: false,
        error: message,
      });
      throw new Error(message);
    }
  },

  fetchProfile: async () => {
    // Only fetch if we have a token but no user loaded yet
    const { isInitializing, user } = get();
    if (!isInitializing || user) return;

    try {
      const response = await auth.getMe();
      set({
        user: response.data.user,
        isInitializing: false,
        isAuthenticated: true,
      });
    } catch {
      // Token is invalid/expired — clear auth
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
