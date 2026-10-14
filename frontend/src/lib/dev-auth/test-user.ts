import { ApiError, fetchOrThrow } from "@/lib/api-error";

// Under `bun run dev` there is no gbandit auth on localhost, so the game plays
// as one of your project's Test Users instead: made-up players of your dev
// environment, picked in the DEV toolbar. The Vite dev server fetches their
// tokens with `gbandit test-token` (see `testUserTokens` in vite.config.ts).

export const TEST_USER_COUNT = 10;

/** 1 to TEST_USER_COUNT, or null for logged out. */
export type TestUser = number | null;

const STORAGE_KEY = "gbandit-test-user";

export function getTestUser(): TestUser {
  const number = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isInteger(number) && number >= 1 && number <= TEST_USER_COUNT ? number : null;
}

export function setTestUser(user: TestUser): void {
  if (user) localStorage.setItem(STORAGE_KEY, String(user));
  else localStorage.removeItem(STORAGE_KEY);
}

export async function fetchTestUserToken(): Promise<Response> {
  const user = getTestUser();
  if (!user) {
    throw new ApiError("/__gbandit/test-token", 401, "Pick a test user in the DEV toolbar.");
  }
  return fetchOrThrow(`/__gbandit/test-token/${user}`);
}
