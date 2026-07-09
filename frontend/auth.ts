import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { refreshAccessToken } from "@/lib/refresh-access-token";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://business-management-lyart.vercel.app/api";

const ACCESS_TOKEN_TTL_MS = 14 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = (await res.json()) as {
          user?: { userId: number; username: string; role: string };
          accessToken?: string;
          refreshToken?: string;
          error?: string;
        };

        if (!res.ok || !data.user || !data.accessToken || !data.refreshToken) {
          return null;
        }

        return {
          id: String(data.user.userId),
          name: data.user.username,
          userId: data.user.userId,
          username: data.user.username,
          role: data.user.role,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          userId: user.userId,
          username: user.username,
          role: user.role,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + ACCESS_TOKEN_TTL_MS,
        };
      }

      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - 30_000
      ) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token.userId != null) {
        session.user.userId = token.userId;
        session.user.username = token.username ?? session.user.name ?? "";
        session.user.role = token.role ?? "";
      }
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      if (token.error) {
        session.error = token.error;
      }
      return session;
    },
  },
});
