import type { JWT } from "next-auth/jwt";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://business-management-lyart.vercel.app/api";

const ACCESS_TOKEN_TTL_MS = 14 * 60 * 1000;

export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    const data = (await res.json()) as {
      accessToken?: string;
      user?: { userId: number; username: string; role: string };
      error?: string;
    };

    if (!res.ok || !data.accessToken) {
      throw new Error(data.error ?? "Refresh failed");
    }

    return {
      ...token,
      accessToken: data.accessToken,
      accessTokenExpires: Date.now() + ACCESS_TOKEN_TTL_MS,
      userId: data.user?.userId ?? token.userId,
      username: data.user?.username ?? token.username,
      role: data.user?.role ?? token.role,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}
