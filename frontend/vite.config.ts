import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execFile } from "child_process";
import type { ServerResponse } from "http";
import path from "path";

/**
 * Stands in for the platform under `bun run dev`: serves the gbandit runtime
 * that index.html loads (from `gbandit runtime`), the page where the runtime
 * lets you sign in as one of your project's Test Users, and those Test Users'
 * tokens (from `gbandit test-token`). Your local backend verifies the tokens
 * like any player's (AUTH_AUDIENCE in backend/.env).
 */
function gbanditDevServer(): Plugin {
  const projectDir = path.resolve(__dirname, "..");
  let runtime: Promise<string> | null = null;

  function gbandit(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile("gbandit", args, { cwd: projectDir }, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve(stdout);
      });
    });
  }

  function problem(res: ServerResponse, status: number, title: string, detail: string) {
    res.statusCode = status;
    res.setHeader("content-type", "application/problem+json");
    res.end(JSON.stringify({ type: "about:blank", title, status, detail }));
  }

  return {
    name: "gbandit-dev-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__gbandit/runtime.js", (_req, res) => {
        runtime ??= gbandit(["runtime"]);
        runtime.then(
          (script) => {
            res.setHeader("content-type", "text/javascript");
            res.end(script);
          },
          (error: Error) => {
            runtime = null;
            problem(res, 502, "gbandit runtime failed", error.message);
          },
        );
      });

      // The runtime draws the page itself.
      server.middlewares.use("/__gbandit/login", (_req, res) => {
        res.setHeader("content-type", "text/html");
        res.end('<!doctype html><meta charset="utf-8"><script defer src="/__gbandit/runtime.js"></script>');
      });

      server.middlewares.use("/__gbandit/token", (req, res) => {
        const match = /^\/(user|guest)\/(\d+)$/.exec(req.url ?? "");
        if (!match) {
          problem(res, 404, "Not found", "Ask for /__gbandit/token/<user|guest>/<1-10>.");
          return;
        }
        const [, kind, number] = match;
        gbandit(["test-token", number, ...(kind === "guest" ? ["--guest"] : []), "--json"]).then(
          (token) => {
            res.setHeader("content-type", "application/json");
            res.end(token);
          },
          (error: Error) => problem(res, 502, "gbandit test-token failed", error.message),
        );
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), gbanditDevServer()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Only `bun run dev` reads `server`. The build that `gbandit deploy` runs ignores it.
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
