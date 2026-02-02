"use client";

import { useState } from "react";
import { WebhookRequest, WebhookFile } from "@/types/request";
import { useApiUrl } from "@/contexts/ApiContext";

interface RequestDetailProps {
  request: WebhookRequest | null;
}

type BodyType = "json" | "graphql" | "xml" | "text";

const cleanBody = (body: string): string => {
  return body.replace(/\\([^"\\\/bfnrtu])/g, '$1');
};

const methodColors: Record<string, string> = {
  GET: "text-green-700 bg-green-100",
  POST: "text-blue-700 bg-blue-100",
  PUT: "text-yellow-700 bg-yellow-100",
  PATCH: "text-orange-700 bg-orange-100",
  DELETE: "text-red-700 bg-red-100",
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageType = (contentType: string): boolean => {
  return contentType.startsWith("image/");
};

export function RequestDetail({ request }: RequestDetailProps) {
  const [copiedCurl, setCopiedCurl] = useState(false);
  const apiUrl = useApiUrl();

  if (!request) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="border-4 border-black p-8 text-center bg-gray-100">
          <p className="text-xl font-bold uppercase">SELECT REQUEST</p>
        </div>
      </div>
    );
  }

  const body = request.body ? cleanBody(request.body) : "";

  const detectBodyType = (body: string, headers: Record<string, string[]>): BodyType => {
    const contentType = Object.entries(headers)
      .find(([key]) => key.toLowerCase() === "content-type")?.[1]?.[0] || "";

    if (contentType.includes("graphql")) {
      return "graphql";
    }

    if (contentType.includes("xml")) {
      return "xml";
    }

    const trimmed = body.trim();

    // Check for XML
    if (trimmed.startsWith("<?xml") || (trimmed.startsWith("<") && trimmed.endsWith(">"))) {
      return "xml";
    }

    try {
      const parsed = JSON.parse(body);
      if (parsed && (parsed.query || parsed.mutation)) {
        return "graphql";
      }
      return "json";
    } catch {
      if (
        trimmed.startsWith("query ") ||
        trimmed.startsWith("mutation ") ||
        trimmed.startsWith("subscription ") ||
        trimmed.startsWith("{") && (trimmed.includes("query") || trimmed.includes("mutation"))
      ) {
        return "graphql";
      }
      return "text";
    }
  };

  const formatXml = (xml: string): string => {
    let formatted = "";
    let indent = 0;
    const lines = xml.replace(/>\s*</g, ">\n<").split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Closing tag
      if (trimmedLine.startsWith("</")) {
        indent = Math.max(0, indent - 1);
      }

      formatted += "  ".repeat(indent) + trimmedLine + "\n";

      // Opening tag (not self-closing, not closing)
      if (
        trimmedLine.startsWith("<") &&
        !trimmedLine.startsWith("</") &&
        !trimmedLine.startsWith("<?") &&
        !trimmedLine.endsWith("/>") &&
        !trimmedLine.includes("</")
      ) {
        indent++;
      }
    }

    return formatted.trim();
  };

  const formatJson = (str: string): string => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const formatGraphQL = (body: string): { query: string; variables?: string } => {
    try {
      const parsed = JSON.parse(body);
      if (parsed.query) {
        const formattedQuery = formatGraphQLQuery(parsed.query);
        const variables = parsed.variables
          ? JSON.stringify(parsed.variables, null, 2)
          : undefined;
        return { query: formattedQuery, variables };
      }
    } catch {
      return { query: formatGraphQLQuery(body) };
    }
    return { query: body };
  };

  const formatGraphQLQuery = (query: string): string => {
    let formatted = "";
    let indent = 0;
    let inString = false;
    let prevChar = "";

    const addNewline = () => {
      formatted += "\n" + "  ".repeat(indent);
    };

    for (let i = 0; i < query.length; i++) {
      const char = query[i];

      if (char === '"' && prevChar !== "\\") {
        inString = !inString;
        formatted += char;
      } else if (inString) {
        formatted += char;
      } else if (char === "{") {
        formatted += " {";
        indent++;
        addNewline();
      } else if (char === "}") {
        indent--;
        addNewline();
        formatted += "}";
      } else if (char === "(") {
        formatted += "(";
      } else if (char === ")") {
        formatted += ")";
      } else if (char === ",") {
        formatted += ",";
        if (!query.slice(0, i).split("(").pop()?.includes(")")) {
          formatted += " ";
        }
      } else if (char === "\n" || char === "\r") {
        // Skip
      } else if (char === " " || char === "\t") {
        if (formatted.length > 0 && ![" ", "\n", "{", "("].includes(formatted[formatted.length - 1])) {
          formatted += " ";
        }
      } else {
        formatted += char;
      }
      prevChar = char;
    }

    return formatted.trim();
  };

  const generateCurl = (): string => {
    const isMultipart = request.files && request.files.length > 0;
    const isFormUrlEncoded = request.formFields && Object.keys(request.formFields).length > 0 && !isMultipart;

    let curl = `curl -X ${request.method}`;

    Object.entries(request.headers).forEach(([key, values]) => {
      const lowerKey = key.toLowerCase();
      // Skip headers that curl sets automatically
      if (
        lowerKey === "content-length" ||
        lowerKey === "host" ||
        (isMultipart && lowerKey === "content-type")
      )
        return;
      values.forEach((value) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
      });
    });

    const queryString = Object.entries(request.queryParams)
      .flatMap(([key, values]) => values.map((v) => `${key}=${v}`))
      .join("&");

    const baseUrl = apiUrl;
    const url = `${baseUrl}${request.path}${queryString ? "?" + queryString : ""}`;

    if (isMultipart) {
      // Multipart form data with files
      if (request.formFields) {
        Object.entries(request.formFields).forEach(([key, value]) => {
          curl += ` \\\n  -F "${key}=${value}"`;
        });
      }
      request.files?.forEach((file) => {
        curl += ` \\\n  -F "${file.name}=@/path/to/${file.name}"`;
      });
      curl += `\n# Note: Replace /path/to/<filename> with actual file paths`;
    } else if (isFormUrlEncoded) {
      // URL encoded form data
      Object.entries(request.formFields!).forEach(([key, value]) => {
        curl += ` \\\n  -d "${key}=${encodeURIComponent(value)}"`;
      });
    } else if (body) {
      // Regular body
      curl += ` \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
    }

    curl += ` \\\n  "${url}"`;

    return curl;
  };

  const copyCurl = async () => {
    await navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const downloadFile = (file: WebhookFile) => {
    const link = document.createElement("a");
    link.href = `data:${file.contentType};base64,${file.data}`;
    link.download = file.name;
    link.click();
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      hour12: false,
    });
  };

  const bodyType = body ? detectBodyType(body, request.headers) : "text";

  const renderBody = () => {
    if (!body) return null;

    if (bodyType === "json") {
      return (
        <pre className="border-4 border-black p-4 overflow-auto text-sm bg-green-50 text-green-900">
          {formatJson(body)}
        </pre>
      );
    }

    if (bodyType === "graphql") {
      const { query, variables } = formatGraphQL(body);
      return (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-bold uppercase mb-2 bg-purple-600 text-white px-2 py-1 inline-block">
              QUERY
            </div>
            <pre className="border-4 border-black p-4 overflow-auto text-sm bg-purple-50 text-purple-900">
              {query}
            </pre>
          </div>
          {variables && (
            <div>
              <div className="text-xs font-bold uppercase mb-2 bg-blue-600 text-white px-2 py-1 inline-block">
                VARIABLES
              </div>
              <pre className="border-4 border-black p-4 overflow-auto text-sm bg-blue-50 text-blue-900">
                {variables}
              </pre>
            </div>
          )}
        </div>
      );
    }

    if (bodyType === "xml") {
      return (
        <pre className="border-4 border-black p-4 overflow-auto text-sm bg-orange-50 text-orange-900">
          {formatXml(body)}
        </pre>
      );
    }

    return (
      <pre className="border-4 border-black p-4 overflow-auto text-sm bg-gray-100">
        {body}
      </pre>
    );
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b-4 border-black pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className={`px-2 py-1 border-2 border-black uppercase ${methodColors[request.method] || "bg-gray-100"}`}>
              {request.method}
            </span>
            <span className="font-mono">{request.path}</span>
          </h2>
          <p className="text-xs mt-2 text-gray-600 uppercase font-mono">
            {formatDate(request.timestamp)}
          </p>
        </div>
{(!request.files || request.files.length === 0) && (
          <button
            onClick={copyCurl}
            className={`px-4 py-2 font-bold uppercase text-sm border-4 border-black transition-none ${
              copiedCurl
                ? "bg-green-500 text-white"
                : "bg-yellow-300 text-black hover:bg-yellow-400"
            }`}
          >
            {copiedCurl ? "COPIED!" : "CURL"}
          </button>
        )}
      </div>

      {/* Query Params */}
      {Object.keys(request.queryParams).length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase mb-2 bg-cyan-600 text-white px-2 py-1 inline-block">
            QUERY PARAMS
          </div>
          <div className="border-4 border-black">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cyan-100 border-b-2 border-black">
                  <th className="text-left p-3 font-bold uppercase">KEY</th>
                  <th className="text-left p-3 font-bold uppercase">VALUE</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(request.queryParams).map(([key, values], i) => (
                  <tr key={key} className={i < Object.keys(request.queryParams).length - 1 ? "border-b border-black" : ""}>
                    <td className="p-3 font-mono font-bold">{key}</td>
                    <td className="p-3 font-mono">{values.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Headers */}
      <div>
        <div className="text-xs font-bold uppercase mb-2 bg-gray-800 text-white px-2 py-1 inline-block">
          HEADERS
        </div>
        <div className="border-4 border-black">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-200 border-b-2 border-black">
                <th className="text-left p-3 font-bold uppercase">KEY</th>
                <th className="text-left p-3 font-bold uppercase">VALUE</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(request.headers).map(([key, values], i) => (
                <tr key={key} className={i < Object.keys(request.headers).length - 1 ? "border-b border-black" : ""}>
                  <td className="p-3 font-mono font-bold">{key}</td>
                  <td className="p-3 font-mono break-all">{values.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Fields */}
      {request.formFields && Object.keys(request.formFields).length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase mb-2 bg-indigo-600 text-white px-2 py-1 inline-block">
            FORM FIELDS
          </div>
          <div className="border-4 border-black">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-indigo-100 border-b-2 border-black">
                  <th className="text-left p-3 font-bold uppercase">KEY</th>
                  <th className="text-left p-3 font-bold uppercase">VALUE</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(request.formFields).map(([key, value], i) => (
                  <tr key={key} className={i < Object.keys(request.formFields!).length - 1 ? "border-b border-black" : ""}>
                    <td className="p-3 font-mono font-bold">{key}</td>
                    <td className="p-3 font-mono">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Body */}
      {body && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold uppercase px-2 py-1 ${
              bodyType === "json"
                ? "bg-green-600 text-white"
                : bodyType === "graphql"
                  ? "bg-purple-600 text-white"
                  : bodyType === "xml"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-600 text-white"
            }`}>
              BODY {bodyType !== "text" && `[${bodyType.toUpperCase()}]`}
            </span>
          </div>
          {renderBody()}
        </div>
      )}

      {/* Files */}
      {request.files && request.files.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase mb-2 bg-pink-600 text-white px-2 py-1 inline-block">
            FILES ({request.files.length})
          </div>
          <div className="space-y-4">
            {request.files.map((file, index) => (
              <div key={index} className="border-4 border-black p-4 bg-pink-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-mono font-bold">{file.name}</p>
                    <p className="text-xs text-gray-600 uppercase">
                      {file.contentType} · {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadFile(file)}
                    className="px-4 py-2 bg-pink-600 text-white font-bold uppercase text-sm border-2 border-black hover:bg-pink-700"
                  >
                    DOWNLOAD
                  </button>
                </div>

                {/* Image Preview */}
                {isImageType(file.contentType) && (
                  <div className="border-4 border-black bg-white p-2">
                    <img
                      src={`data:${file.contentType};base64,${file.data}`}
                      alt={file.name}
                      className="max-w-full max-h-96 object-contain mx-auto"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
