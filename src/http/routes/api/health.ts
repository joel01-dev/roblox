import type { IncomingMessage, ServerResponse } from "http";
import { serverStartTime } from "../../../config.js";
import { getActiveClients } from "../../../bridge/handlers/shared/registry.js";

export function GET(_req: IncomingMessage, res: ServerResponse): void {
  const uptime = Date.now() - serverStartTime;
  const clientCount = getActiveClients().length;
  const status = clientCount > 0 ? "ok" : "ok";

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status,
      uptime,
      uptimeFormatted: formatUptime(uptime),
      clientCount,
      timestamp: Date.now(),
    })
  );
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0 || parts.length === 0) parts.push(`${seconds % 60}s`);

  return parts.join(" ");
}