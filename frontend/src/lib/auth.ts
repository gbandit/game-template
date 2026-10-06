import { fetchOrThrow } from "@/lib/api-error";
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
  await fetchOrThrow(`${authOrigin()}/api/logout`, {
    method: "POST",
    credentials: "include",
  });
  window.location.assign(redirect);
}

export function guestUrl(redirect = window.location.href): string {
  return loginUrl(redirect);
}

/**
 * A token for the player. Visiting your game normally creates a guest
 * automatically, so one is almost always available. When the auth service
 * refuses, the refusal is thrown as an `ApiError`:
 *
 * - a 401 with no problem type: no session at all.
 * - `session-expired`: the player *had* an account (Google, or one merged into
 *   another) and its session died. The auth service refuses to silently
 *   replace it with a new guest, because that would drop them into your game
 *   as a stranger with none of their progress. Send them to `loginUrl()`.
 * - `guest-limit-reached`: the player's network already holds as many guests
 *   as the auth service allows, so this visitor has to sign in with Google
 *   instead. Send them to `loginUrl()`.
 * - `account-suspended`: the platform has suspended the player. Signing in
 *   again can't help, so don't send them to `loginUrl()`; show them
 *   `error.message`.
 */
export async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && tokenState.value && Date.now() < tokenState.expiresAt - 30_000) {
    return tokenState.value;
  }

  // Past this point the cached token is expiring or was rejected.
  tokenState.value = null;
  tokenState.expiresAt = 0;

  const response = await fetchOrThrow(`${authOrigin()}/api/token`, {
    method: "POST",
    credentials: "include",
  });
  const payload = (await response.json()) as TokenResponse;
  tokenState.value = payload.access_token;
  tokenState.expiresAt = Date.parse(payload.expires_at);
  return payload.access_token;
}
