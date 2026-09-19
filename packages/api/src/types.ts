export const API_SERVICE = "fuse-api" as const;
export const API_MODE = "synthetic" as const;
export const ESTIMATED_COST_LABEL = "Estimated run cost" as const;

export interface HttpRequest {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body?: string;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}
