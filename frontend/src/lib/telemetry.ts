import { getAccessToken } from "@/lib/auth";

const HEARTBEAT_PATH = "/__gbandit/telemetry/heartbeat";
const JITTER_MS = 20_000;

let timer: number | null = null;
let started = false;

export function startTenantTelemetry(): void {
  if (started || typeof window === "undefined") {
    return;
  }
  started = true;

  document.addEventListener("visibilitychange", handleVisibilityChange);
  if (document.visibilityState === "visible") {
    void sendHeartbeat();
    scheduleNextHeartbeat();
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    void sendHeartbeat();
    scheduleNextHeartbeat();
  } else {
    clearScheduledHeartbeat();
  }
}

function scheduleNextHeartbeat(): void {
  clearScheduledHeartbeat();
  if (document.visibilityState !== "visible") {
    return;
  }

  const now = new Date();
  const next = new Date(now);
  next.setSeconds(30, 0);
  if (next.getTime() <= now.getTime()) {
    next.setMinutes(next.getMinutes() + 1);
  }
  const jitter = (Math.random() * 2 - 1) * JITTER_MS;
  const delay = Math.max(1_000, next.getTime() + jitter - now.getTime());

  timer = window.setTimeout(async () => {
    timer = null;
    if (document.visibilityState === "visible") {
      await sendHeartbeat();
      scheduleNextHeartbeat();
    }
  }, delay);
}

function clearScheduledHeartbeat(): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}

async function sendHeartbeat(): Promise<void> {
  try {
    const token = await getAccessToken();
    await fetch(HEARTBEAT_PATH, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
      keepalive: true,
    });
  } catch {
    // Telemetry must never affect gameplay.
  }
}
