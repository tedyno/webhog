export interface WebhookFile {
  name: string;
  contentType: string;
  size: number;
  data: string; // base64 encoded
}

export interface WebhookRequest {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string[]>;
  body: string;
  queryParams: Record<string, string[]>;
  files?: WebhookFile[];
  formFields?: Record<string, string>;
}
