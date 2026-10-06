import { ApiError, fetchOrThrow } from "@/lib/api-error";
import { getAccessToken } from "@/lib/auth";
import { withDevUser } from "@/lib/dev-auth/dev-fetch";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchOrThrow(path, init);
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(path, response.status, "The server sent a response we couldn't read.", {
      requestId: response.headers.get("x-request-id") ?? undefined,
    });
  }
}

function withBearer(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${token}`);
  return { ...init, headers };
}

async function prodApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  try {
    return await fetchJson<T>(path, withBearer(init, token));
  } catch (error) {
    // A cached token may still validate locally but be rejected by the server
    // (clock skew, JWKS rotation). Retry once with a forced refresh.
    if (error instanceof ApiError && error.status === 401) {
      return fetchJson<T>(path, withBearer(init, await getAccessToken(true)));
    }
    throw error;
  }
}

/**
 * Calls your backend as the signed-in player. Every failure is thrown as an
 * `ApiError`; branch on `error.is(...)` or `error.status`, and show the player
 * `error.message`.
 */
export async function apiFetchWithToken<T>(path: string, init?: RequestInit): Promise<T> {
  if (import.meta.env.DEV) return fetchJson<T>(path, withDevUser(init));
  return prodApiFetch<T>(path, init);
}
