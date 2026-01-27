"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WebhookRequest } from "@/types/request";

export function useWebSocket() {
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((config) => setApiUrl(config.apiUrl))
      .catch(() => setApiUrl("http://localhost:8080"));
  }, []);

  const connect = useCallback(() => {
    if (!apiUrl) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = apiUrl.replace(/^http/, "ws") + "/_ws";
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const request: WebhookRequest = JSON.parse(event.data);
        setRequests((prev) => [request, ...prev]);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected, reconnecting...");
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current = ws;
  }, [apiUrl]);

  const fetchHistory = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/_api/requests`);
      if (response.ok) {
        const data: WebhookRequest[] = await response.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, [apiUrl]);

  const clearRequests = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/_api/requests/clear`, { method: "POST" });
      if (response.ok) {
        setRequests([]);
      }
    } catch (err) {
      console.error("Failed to clear requests:", err);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (apiUrl) {
      fetchHistory();
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [apiUrl, connect, fetchHistory]);

  return { requests, isConnected, clearRequests, apiUrl };
}
