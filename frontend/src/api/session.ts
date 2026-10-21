import { redirectDocument } from "react-router";
import { apiFetch } from "@/lib/http";

export interface SessionUser {
  id: string;
  name: string;
  is_anon: boolean;
}

export function getMe(): Promise<SessionUser> {
  return apiFetch<SessionUser>("/api/me");
}

/**
 * Visiting a game creates a guest automatically, so a player only lacks a
 * session when the auth service wants them to sign in with Google again
 * because their session expired.
 */
function isSignedOut(error: unknown): boolean {
  return error instanceof gbandit.GbanditError && error.status === 401;
}

// Loaders let any other failure propagate as it is; RouteError shows it. The
// sign-in page is never one of this app's routes, so it gets a full page load.

export async function requireUser(): Promise<SessionUser> {
  try {
    return await getMe();
  } catch (error) {
    if (isSignedOut(error)) throw redirectDocument(gbandit.loginUrl());
    throw error;
  }
}
