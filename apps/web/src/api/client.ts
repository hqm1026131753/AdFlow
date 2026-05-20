import type { WorkflowDef } from "@ad-flow/shared";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface ApiError {
  message: string;
  status?: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { message: body.error ?? res.statusText, status: res.status } as ApiError;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDetail extends WorkflowListItem {
  nodes: WorkflowDef["nodes"];
  edges: WorkflowDef["edges"];
}

export const api = {
  workflows: {
    list: () => request<WorkflowListItem[]>("/workflows"),
    get: (id: string) => request<WorkflowDetail>(`/workflows/${id}`),
    create: (data: { name: string; description?: string; nodes?: WorkflowDef["nodes"]; edges?: WorkflowDef["edges"] }) =>
      request<WorkflowDetail>("/workflows", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string; nodes?: WorkflowDef["nodes"]; edges?: WorkflowDef["edges"] }) =>
      request<{ id: string; updatedAt: string }>(`/workflows/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/workflows/${id}`, { method: "DELETE" }),
  },
  execution: {
    trigger: (data: { workflowId?: string; nodes?: WorkflowDef["nodes"]; edges?: WorkflowDef["edges"]; batchCount?: number }) =>
      request<{ runId: string; status: string }>("/executions", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<Record<string, unknown>>(`/executions/${id}`),
    cancel: (id: string) => request<void>(`/executions/${id}`, { method: "DELETE" }),
  },

  scout: {
    search: (params: { keywords: string; platform?: string; count?: number }) =>
      request<{ references: Array<{ url: string; source: string; sourceUrl?: string; overall: number; reason: string }> }>(
        "/scout",
        { method: "POST", body: JSON.stringify(params) }
      ),
  },

  generate: {
    run: (params: { nodeType: string; config: Record<string, unknown>; inputs?: Record<string, unknown> }) =>
      request<{ texts?: string[]; images?: string[] }>("/generate", {
        method: "POST",
        body: JSON.stringify(params),
      }),
  },

  agent: {
    chat: (params: { messages: Array<{ role: "user" | "assistant"; content: string }>; context?: { nodeCount: number; nodeTypes: string[] } }) =>
      request<{ text: string; action?: { type: string; nodeType?: string; label?: string; payload?: unknown } }>("/agent/chat", {
        method: "POST",
        body: JSON.stringify(params),
      }),
  },
};
