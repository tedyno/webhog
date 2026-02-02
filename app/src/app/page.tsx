"use client";

import { useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { RequestList } from "@/components/RequestList";
import { RequestDetail } from "@/components/RequestDetail";
import { WebhookRequest } from "@/types/request";
import { useApiUrl } from "@/contexts/ApiContext";

export default function Home() {
  const { requests, isConnected, clearRequests } = useWebSocket();
  const apiUrl = useApiUrl();
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(
    null
  );

  const handleClear = async () => {
    await clearRequests();
    setSelectedRequest(null);
  };

  return (
    <div className="flex flex-col h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b-4 border-black">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            WEBHOG
          </h1>
          <div className={`flex items-center gap-2 border-2 px-3 py-1 ${
            isConnected ? "border-green-600 bg-green-100" : "border-red-600 bg-red-100"
          }`}>
            <div
              className={`w-3 h-3 ${
                isConnected ? "bg-green-600" : "bg-red-600"
              }`}
            />
            <span className={`text-xs uppercase font-bold ${
              isConnected ? "text-green-700" : "text-red-700"
            }`}>
              {isConnected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm uppercase font-bold">
            [{requests.length}]
          </span>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-600 text-white font-bold uppercase text-sm hover:bg-red-700 border-2 border-black transition-none"
          >
            CLEAR
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Request list */}
        <div className="w-80 border-r-4 border-black overflow-auto bg-gray-50">
          <RequestList
            requests={requests}
            selectedId={selectedRequest?.id || null}
            onSelect={setSelectedRequest}
          />
        </div>

        {/* Request detail */}
        <div className="flex-1 overflow-auto bg-white">
          <RequestDetail request={selectedRequest} />
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-2 border-t-4 border-black text-xs uppercase bg-yellow-300 font-bold">
        ENDPOINT: {apiUrl || "..."}/*
      </footer>
    </div>
  );
}
