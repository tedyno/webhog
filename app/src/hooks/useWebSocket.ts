"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WebhookRequest } from "@/types/request";

const WS_URL = "ws://localhost:8080/_ws";
const API_URL = "http://localhost:8080/_api/requests";

export function useWebSocket() {
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

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
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data: WebhookRequest[] = await response.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, []);

  const clearRequests = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/clear`, { method: "POST" });
      if (response.ok) {
        setRequests([]);
      }
    } catch (err) {
      console.error("Failed to clear requests:", err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, fetchHistory]);

  return { requests, isConnected, clearRequests };
}
