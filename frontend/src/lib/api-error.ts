// gBandit answers failures with an RFC 9457 Problem Details body
// (`application/problem+json`, https://docs.gbandit.com/errors): the auth
// service, and the platform when it answers on your game's address instead of
// your backend. The template's backend answers the same way
// (backend/src/errors.rs). Every failed request becomes an `ApiError` whose
// `message` is the body's `detail`, a sentence written for the player.

const PROBLEM_TYPE_BASE = "https://docs.gbandit.com/errors#";

const UNKNOWN_ERROR = "Something went wrong. Please try again.";

/** The gBandit problem types the template branches on. */
export type ProblemSlug =
  | "no-backend"
  | "session-expired"
  | "guest-limit-reached"
  | "account-suspended";

export class ApiError extends Error {
  /** 0 when no response arrived at all. */
  readonly status: number;
  /** `about:blank`, or a gBandit problem type; check it with `is`. */
  readonly type: string;
  readonly path: string;
  /** The id the request was logged under. Quote it when asking for help. */
  readonly requestId?: string;

  constructor(
    path: string,
    status: number,
    message: string,
    options: { type?: string; requestId?: string } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.path = path;
    this.status = status;
    this.type = options.type ?? "about:blank";
    this.requestId = options.requestId;
  }

  is(slug: ProblemSlug): boolean {
    return this.type === `${PROBLEM_TYPE_BASE}${slug}`;
  }
}

/** The sentence to show the player for anything thrown. Only an ApiError
 *  carries one written for a person; anything else is a bug whose message is
 *  not. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return UNKNOWN_ERROR;
}

/**
 * `fetch` that throws an `ApiError` for anything but a 2xx answer, including
 * no answer at all. An abort is the caller's own doing and is rethrown as is.
 */
export async function fetchOrThrow(url: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new ApiError(url, 0, "Couldn't reach the server. Check your connection and try again.");
  }
  if (!response.ok) throw await errorFromResponse(url, response);
  return response;
}

type ProblemBody = { type?: string; detail?: string; request_id?: string };

async function errorFromResponse(url: string, response: Response): Promise<ApiError> {
  const problem = response.headers.get("content-type")?.startsWith("application/problem+json")
    ? ((await response.json().catch(() => null)) as ProblemBody | null)
    : null;
  return new ApiError(url, response.status, problem?.detail ?? UNKNOWN_ERROR, {
    type: problem?.type,
    requestId: problem?.request_id ?? response.headers.get("x-request-id") ?? undefined,
  });
}
