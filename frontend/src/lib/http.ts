const UNKNOWN_ERROR = "Something went wrong on this page.";

/**
 * Calls your backend as the signed-in player and reads its JSON answer, with
 * `gbandit.fetch` from the gbandit runtime. Every refusal is thrown as a
 * `GbanditError`, read from the Problem Details body your backend answers
 * with (backend/src/errors.rs); branch on `error.is(...)` or `error.status`,
 * and show the player `error.message`.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await gbandit.fetch(path, init);
  return (await response.json()) as T;
}

/** The sentence to show the player for anything thrown. Only a GbanditError
 *  carries one written for a person; anything else is a bug whose message is
 *  not. */
export function errorMessage(error: unknown): string {
  if (error instanceof gbandit.GbanditError) return error.message;
  return UNKNOWN_ERROR;
}
