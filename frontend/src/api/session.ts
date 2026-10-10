import { redirect } from "react-router";
import { ApiError } from "@/lib/api-error";
import { loginUrl } from "@/lib/auth";
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
 * Visiting a game creates a guest automatically, so a player only lacks a
 * session when the auth service wants them to sign in with Google: their
 * session expired, or their network already holds too many guests.
 */
function isSignedOut(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.is("guest-limit-reached"));
}

// Loaders let any other failure propagate as it is; RouteError shows it.

export async function requireUser(): Promise<SessionUser> {
  try {
    return await getMe();
  } catch (error) {
    if (isSignedOut(error)) throw redirect(loginUrl());
    throw error;
  }
}
