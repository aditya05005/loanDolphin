import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../services/api";

/**
 * Opens an authenticated socket (the httpOnly login cookie is sent with the
 * handshake) while `enabled` is true and calls `onStatusUpdated` for every
 * `loan_status_updated` event the server pushes to this user's room.
 */
export function useLoanNotifications(enabled, onStatusUpdated) {
  // Keep the latest callback without reconnecting the socket on every render.
  const handlerRef = useRef(onStatusUpdated);
  useEffect(() => {
    handlerRef.current = onStatusUpdated;
  }, [onStatusUpdated]);

  useEffect(() => {
    if (!enabled) return undefined;

    const socket = io(SOCKET_URL || undefined, { withCredentials: true });
    socket.on("loan_status_updated", (payload) => handlerRef.current?.(payload));

    return () => {
      socket.off("loan_status_updated");
      socket.disconnect();
    };
  }, [enabled]);
}
