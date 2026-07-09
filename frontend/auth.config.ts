import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/auth",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
} satisfies NextAuthConfig;
