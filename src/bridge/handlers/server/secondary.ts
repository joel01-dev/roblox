import { WebSocket } from "ws";
import { WS_PORT } from "../../../config.js";
import {
  resetSecondaryState,
  secondaryResponseResolvers,
  setInstanceRole,
  setRelaySocket,
} from "../shared/communication.js";
import type { RobloxResponse } from "../../types.js";

const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_TIMEOUT_MS = 10000;
const MAX_MISSED_HEARTBEATS = 2;

export function startAsSecondary(
  relayUrl: string = `ws://localhost:${WS_PORT}/mcp-relay`,
  onFailed?: () => void,
  onPromote?: () => void
): void {
  setInstanceRole("secondary");
  resetSecondaryState();

  console.error(`[Secondary] Connecting to primary relay at ${relayUrl} ...`);

  const socket = new WebSocket(relayUrl);
  setRelaySocket(socket);

  let everConnected = false;
  let missedHeartbeats = 0;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let heartbeatTimeoutTimer: NodeJS.Timeout | null = null;

  const sendHeartbeat = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "heartbeat-ping" }));
    }
  };

  const onHeartbeatTimeout = () => {
    missedHeartbeats += 1;
    console.error(`[Secondary] Heartbeat timeout (${missedHeartbeats}/${MAX_MISSED_HEARTBEATS}).`);

    if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
      console.error("[Secondary] Primary unresponsive. Closing connection.");
      socket.close();
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    missedHeartbeats = 0;
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (heartbeatTimeoutTimer) {
      clearTimeout(heartbeatTimeoutTimer);
      heartbeatTimeoutTimer = null;
    }
  };

  socket.on("open", () => {
    everConnected = true;
    console.error("[Secondary] Connected to primary via relay.");
    startHeartbeat();
  });

  socket.on("message", (rawData) => {
    try {
      const data = JSON.parse(rawData.toString()) as RobloxResponse & { type?: string };

      // Handle heartbeat pong
      if (data && data.type === "heartbeat-pong") {
        missedHeartbeats = 0;
        if (heartbeatTimeoutTimer) {
          clearTimeout(heartbeatTimeoutTimer);
          heartbeatTimeoutTimer = null;
        }
        return;
      }

      // Handle regular response
      if (data.id) {
        const resolver = secondaryResponseResolvers.get(data.id);
        if (resolver) {
          resolver(data as RobloxResponse);
          secondaryResponseResolvers.delete(data.id);
        }
      }
    } catch (e) {
      console.error("[Secondary] Error parsing relay response:", e);
    }
  });

  socket.on("close", () => {
    stopHeartbeat();
    setRelaySocket(null);
    // Reject all pending resolvers so tool calls don't hang forever.
    for (const [id, resolver] of secondaryResponseResolvers.entries()) {
      resolver({ id, output: undefined });
    }
    secondaryResponseResolvers.clear();

    if (!everConnected && onFailed) {
      console.error("[Secondary] Never connected — remote unreachable. Falling back to primary mode.");
      onFailed();
    } else if (everConnected) {
      console.error("[Secondary] Lost connection to primary. Attempting promotion...");
      onPromote?.();
    }
  });

  socket.on("error", (err) => {
    console.error("[Secondary] Relay socket error:", err.message);
    // "error" is always followed by "close", so fallback is handled there.
  });
}
