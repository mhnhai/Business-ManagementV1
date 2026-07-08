"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi } from "@/lib/api";
import { isAdmin } from "@/lib/permissions";

export interface SessionUser {
  userId: number;
  username: string;
  role: string;
}

type AuthContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  clearUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await authApi.check();
      const u = data.user as SessionUser;
      if (u?.userId != null && u?.username && u?.role) {
        setUser(u);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      await refresh();
      setIsLoading(false);
    })();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAdmin: isAdmin(user?.role),
      refresh,
      clearUser: () => setUser(null),
    }),
    [user, isLoading, refresh],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
