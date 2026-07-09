"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { setAuthTokens } from "@/lib/auth-tokens";
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

function AuthTokenSync({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  if (session?.accessToken && session?.refreshToken) {
    setAuthTokens(session.accessToken, session.refreshToken);
  } else if (status === "unauthenticated") {
    setAuthTokens(null, null);
  }

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      void signOut({ callbackUrl: "/auth" });
    }
  }, [session?.error]);

  return <>{children}</>;
}

function AuthContextBridge({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();

  const user = useMemo((): SessionUser | null => {
    if (session?.user?.userId == null || !session.user.role) {
      return null;
    }
    return {
      userId: session.user.userId,
      username: session.user.username ?? session.user.name ?? "",
      role: session.user.role,
    };
  }, [session]);

  const refresh = useCallback(async () => {
    await update();
  }, [update]);

  const clearUser = useCallback(() => {
    setAuthTokens(null, null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading: status === "loading",
      isAdmin: isAdmin(user?.role),
      refresh,
      clearUser,
    }),
    [user, status, refresh, clearUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthTokenSync>
        <AuthContextBridge>{children}</AuthContextBridge>
      </AuthTokenSync>
    </SessionProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export { signOut };
