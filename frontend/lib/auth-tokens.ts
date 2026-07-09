let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setAuthTokens(
  access: string | null,
  refresh: string | null,
): void {
  accessToken = access;
  refreshToken = refresh;
}

export function getAuthTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return { accessToken, refreshToken };
}
