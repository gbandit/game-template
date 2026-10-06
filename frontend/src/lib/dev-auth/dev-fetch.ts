import { getDevUser } from "./dev-user";

/** Acts as the test user picked in the DEV toolbar instead of sending a token. */
export function withDevUser(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const devUser = getDevUser();
  if (devUser) headers.set("X-Dev-User", devUser);
  return { ...init, headers };
}
