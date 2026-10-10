import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const MAX_LINES = 500;
const IGNORE_TOKEN = "pi-ignore-large-file";
const SUPPORTED_EXTENSIONS = new Set([".ts", ".js", ".rs"]);

function normalizeToolPath(cwd: string, path: unknown): string | undefined {
    if (typeof path !== "string" || path.trim() === "") return undefined;
    const normalized = path.startsWith("@") ? path.slice(1) : path;
    return resolve(cwd, normalized);
}

function countLines(contents: string): number {
    if (contents.length === 0) return 0;
    const newlineCount = contents.match(/\n/g)?.length ?? 0;
    return newlineCount + (contents.endsWith("\n") ? 0 : 1);
}

export default function(pi: ExtensionAPI) {
    let warnedFiles = new Set<string>();

    pi.on("agent_start", () => {
        warnedFiles = new Set<string>();
    });

    pi.on("tool_result", async (event, ctx) => {
        if (event.isError) return undefined;
        if (event.toolName !== "write" && event.toolName !== "edit") return undefined;

        const absolutePath = normalizeToolPath(ctx.cwd, (event.input as { path?: unknown }).path);
        if (!absolutePath || warnedFiles.has(absolutePath)) return undefined;
        if (!SUPPORTED_EXTENSIONS.has(extname(absolutePath))) return undefined;

        const contents = await readFile(absolutePath, "utf8");
        if (contents.includes(IGNORE_TOKEN)) return undefined;

        const lines = countLines(contents);
        if (lines <= MAX_LINES) return undefined;

        warnedFiles.add(absolutePath);
        const message = `File size warning: ${absolutePath} is now ${lines} lines, over the ${MAX_LINES}-line limit. Split it up before adding more to it. If the file is meant to be this large, add the comment "${IGNORE_TOKEN}" to it.`;

        if (ctx.isIdle()) {
            pi.sendUserMessage(message);
        } else {
            pi.sendUserMessage(message, { deliverAs: "steer" });
        }

        if (ctx.hasUI) {
            ctx.ui.notify(`File too large: ${absolutePath} (${lines} lines)`, "warning");
        }

        return undefined;
    });
}
