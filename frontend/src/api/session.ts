import { redirect } from "react-router";
import { ApiError } from "@/lib/api-error";
import { apiFetchWithToken } from "@/lib/http";

export interface SessionUser {
  id: string;
  name: string;
  is_anon: boolean;
}

export function getMe(): Promise<SessionUser> {
  return apiFetchWithToken<SessionUser>("/api/me");
}

/**
 * Not signed in: no session (401), or the auth service sending the player to
 * sign in instead of handing out another guest. Both are answered by the
 * logged-out page, which offers sign-in.
 */
function isSignedOut(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.is("guest-limit-reached"));
}

export async function getOptionalMe(): Promise<SessionUser | null> {
  try {
    return await getMe();
  } catch (error) {
    // `no-backend` is the platform answering for a game whose backend isn't
    // deployed (backend commented out in gbandit.jsonc), so there are no
    // players to sign in. A 404 from your own backend is a real error.
    if (isSignedOut(error) || (error instanceof ApiError && error.is("no-backend"))) {
      return null;
    }
    throw error;
  }
}

// Loaders let any other failure propagate as it is; RouteError shows it.

export async function requireUser(): Promise<SessionUser> {
  try {
    return await getMe();
  } catch (error) {
    if (isSignedOut(error)) throw redirect("/");
    throw error;
  }
}

export function optionalUser(): Promise<SessionUser | null> {
  return getOptionalMe();
}
