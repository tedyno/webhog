"use client";

import { WebhookRequest } from "@/types/request";

interface RequestListProps {
  requests: WebhookRequest[];
  selectedId: string | null;
  onSelect: (request: WebhookRequest) => void;
}

const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: "bg-green-500", text: "text-white" },
  POST: { bg: "bg-blue-600", text: "text-white" },
  PUT: { bg: "bg-yellow-500", text: "text-black" },
  PATCH: { bg: "bg-orange-500", text: "text-white" },
  DELETE: { bg: "bg-red-600", text: "text-white" },
};

export function RequestList({
  requests,
  selectedId,
  onSelect,
}: RequestListProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center border-4 border-black p-8 bg-yellow-100">
          <p className="text-xl font-bold uppercase">NO DATA</p>
          <p className="text-xs mt-4 uppercase">
            WAITING FOR REQUESTS...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {requests.map((request) => {
        const isSelected = selectedId === request.id;
        const colors = methodColors[request.method] || { bg: "bg-gray-500", text: "text-white" };

        return (
          <div
            key={request.id}
            className={`p-3 cursor-pointer border-b-2 border-black ${
              isSelected
                ? "bg-blue-200 border-l-4 border-l-blue-600"
                : "hover:bg-gray-100"
            }`}
            onClick={() => onSelect(request)}
          >
            <div className="flex items-center gap-3">
              <span className={`font-bold text-xs uppercase px-2 py-1 border-2 border-black ${colors.bg} ${colors.text}`}>
                {request.method}
              </span>
              <span className="text-sm truncate flex-1 font-mono">
                {request.path}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-600 font-mono">
              {formatTime(request.timestamp)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
