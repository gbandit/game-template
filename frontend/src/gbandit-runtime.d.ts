// Types for `gbandit`, the global that index.html loads from
// /__gbandit/runtime.js (https://docs.gbandit.com/runtime).

/** The gBandit problem types a game is likely to branch on. */
type GbanditProblemSlug =
  | "no-backend"
  | "session-expired"
  | "account-suspended";

/** A refusal from gBandit, read from its Problem Details body. */
interface GbanditError extends Error {
  readonly name: "GbanditError";
  /** The URL that refused. */
  readonly url: string;
  /** 0 when no response arrived at all. */
  readonly status: number;
  /** `about:blank`, or a gBandit problem type; check it with `is`. */
  readonly type: string;
  /** The id the request was logged under. Quote it when asking for help. */
  readonly requestId?: string;
  is(slug: GbanditProblemSlug): boolean;
}

interface GbanditRuntime {
  /**
   * A token for the player, cached until shortly before it expires. A first
   * visit creates a guest, so one is almost always available. Rejects with a
   * `GbanditError`: `session-expired` means "send the player to
   * `loginUrl()`", `account-suspended` means they can't play.
   * Under a local dev server it is a Test User's token from the dev server.
   */
  getAccessToken(options?: { forceRefresh?: boolean }): Promise<string>;
  /**
   * `fetch` to the game's own address as the player: it sends their token,
   * replaces it once if the backend answers 401, and rejects with a
   * `GbanditError` for anything but a 2xx answer, including no answer at all.
   * Another origin is refused, so the token never leaves the game. A body
   * has to be sendable twice, so not a stream.
   */
  fetch(input: string | URL, init?: RequestInit): Promise<Response>;
  /** The sign-in page, which sends the player back to `redirect` (default: here). */
  loginUrl(redirect?: string): string;
  /** Where the player changes their username, then back to `redirect`. */
  profileUrl(redirect?: string): string;
  /** Signs the player out of gbandit, then navigates to `redirect` (default: the game's start). */
  signOut(redirect?: string): Promise<void>;
  /** Reports an error to `gbandit logs frontend` without throwing one. */
  reportError(message: string, metadata?: Record<string, unknown>): void;
  readonly GbanditError: abstract new (...args: never[]) => GbanditError;
}

declare const gbandit: GbanditRuntime;

interface Window {
  readonly gbandit: GbanditRuntime;
}
