import { gbanditOrigin } from "@/lib/gbandit";

type TokenResponse = {
  access_token: string;
  expires_at: string;
};

const tokenState: {
  value: string | null;
  expiresAt: number;
} = {
  value: null,
  expiresAt: 0,
};

export function authOrigin(): string {
  return gbanditOrigin("auth");
}

export function loginUrl(redirect = window.location.href): string {
  return `${authOrigin()}/login?redirect=${encodeURIComponent(redirect)}`;
}

/** Signs the player out of gbandit, then navigates to `redirect`. */
export async function signOut(redirect = window.location.origin): Promise<void> {
  const response = await fetch(`${authOrigin()}/api/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`failed to sign out: ${response.status}`);
  }
  window.location.assign(redirect);
}

export function guestUrl(redirect = window.location.href): string {
  return loginUrl(redirect);
}

/**
 * Visiting your game normally creates a guest automatically, so a token is
 * almost always available. The exception worth handling is `session_expired`:
 * the player *had* an account (Google, or one merged into another) and its
 * session died — the auth service refuses to silently replace it with a new
 * guest, because that would drop them into your game as a stranger with none
 * of their progress. Send those players to `loginUrl()`.
 */
export type AccessTokenResult =
  | { status: "token"; access_token: string; expires_at: string }
  | { status: "session_expired" }
  | { status: "signed_out" };

async function unauthorizedResult(response: Response): Promise<AccessTokenResult> {
  tokenState.value = null;
  tokenState.expiresAt = 0;
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload.error === "session_expired") {
      return { status: "session_expired" };
    }
  } catch {
    // Other 401s from the auth service carry a plain-text body.
  }
  return { status: "signed_out" };
}

export async function requestAccessToken(
  forceRefresh = false,
): Promise<AccessTokenResult> {
  const now = Date.now();
  if (!forceRefresh && tokenState.value && now < tokenState.expiresAt - 30_000) {
    return {
      status: "token",
      access_token: tokenState.value,
      expires_at: new Date(tokenState.expiresAt).toISOString(),
    };
  }

  const response = await fetch(`${authOrigin()}/api/token`, {
    method: "POST",
    credentials: "include",
  });

  if (response.status === 401) {
    return unauthorizedResult(response);
  }

  if (!response.ok) {
    throw new Error(`failed to mint access token: ${response.status}`);
  }

  const payload = (await response.json()) as TokenResponse;
  tokenState.value = payload.access_token;
  tokenState.expiresAt = Date.parse(payload.expires_at);
  return {
    status: "token",
    access_token: payload.access_token,
    expires_at: payload.expires_at,
  };
}

export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  const result = await requestAccessToken(forceRefresh);
  return result.status === "token" ? result.access_token : null;
}
