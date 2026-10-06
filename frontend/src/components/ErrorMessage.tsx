import { ApiError, errorMessage } from "@/lib/api-error";

/** What went wrong, with the request id the player can quote when asking for help. */
export function ErrorMessage({ error }: { error: unknown }) {
  const requestId = error instanceof ApiError ? error.requestId : undefined;

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-foreground/60">{errorMessage(error)}</p>
      {requestId && (
        <p className="font-mono text-xs text-foreground/40">Request ID: {requestId}</p>
      )}
    </div>
  );
}
