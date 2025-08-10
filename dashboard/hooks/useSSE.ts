"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseSSEOptions {
  onLogEntry?: (data: Record<string, unknown>) => void;
  onComplianceUpdate?: (data: Record<string, unknown>) => void;
  onConnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    onLogEntry,
    onComplianceUpdate,
    onConnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/events");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("SSE connection opened");
      isConnectedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    eventSource.addEventListener("connected", (event) => {
      console.log("SSE connected:", event.data);
      onConnect?.();
    });

    eventSource.addEventListener("log_entry", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received log entry update:", data);
        onLogEntry?.(data);
      } catch (error) {
        console.error("Failed to parse log entry event:", error);
      }
    });

    eventSource.addEventListener("compliance_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received compliance update:", data);
        onComplianceUpdate?.(data);
      } catch (error) {
        console.error("Failed to parse compliance event:", error);
      }
    });

    eventSource.addEventListener("ping", () => {
      // Keep-alive ping, no action needed
    });

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      isConnectedRef.current = false;
      onError?.(error);

      if (autoReconnect && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect SSE...");
          connect();
        }, reconnectInterval);
      }
    };
  }, [
    onLogEntry,
    onComplianceUpdate,
    onConnect,
    onError,
    autoReconnect,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isConnectedRef.current = false;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect,
  };
}
