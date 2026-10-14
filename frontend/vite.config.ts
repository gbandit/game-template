import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execFile } from "child_process";
import path from "path";

/**
 * Serves `GET /__gbandit/test-token/<n>` under `bun run dev` with a token for
 * your project's Test User <n>, from `gbandit test-token`. Your local backend
 * verifies it like any player's token (AUTH_AUDIENCE in backend/.env).
 */
function testUserTokens(): Plugin {
  return {
    name: "gbandit-test-user-tokens",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__gbandit/test-token", (req, res) => {
        const number = req.url?.slice(1) ?? "";
        execFile(
          "gbandit",
          ["test-token", number, "--json"],
          { cwd: path.resolve(__dirname, "..") },
          (error, stdout, stderr) => {
            if (error) {
              res.statusCode = 502;
              res.setHeader("content-type", "application/problem+json");
              res.end(JSON.stringify({ title: "gbandit test-token failed", detail: stderr || error.message }));
              return;
            }
            res.setHeader("content-type", "application/json");
            res.end(stdout);
          },
        );
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), testUserTokens()],
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
