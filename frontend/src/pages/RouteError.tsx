import { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ApiError } from "@/lib/api-error";

export function RouteError() {
  const error = useRouteError();

  useEffect(() => {
    if (error instanceof ApiError) {
      console.error("[route] request failed", {
        path: error.path,
        status: error.status,
        type: error.type,
        requestId: error.requestId,
      });
      return;
    }

    if (isRouteErrorResponse(error)) {
      console.error("[route] route error response", {
        status: error.status,
        statusText: error.statusText,
        data: error.data,
      });
      return;
    }

    console.error("[route] unexpected route error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <ErrorMessage error={error} />
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5 transition-colors"
      >
        Try again
      </button>
    </main>
  );
}
