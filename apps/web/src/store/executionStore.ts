import { create } from "zustand";
import type { SSEEvent, NodeExecutionStatus } from "@ad-flow/shared";

interface ExecutionState {
  isRunning: boolean;
  runId: string | null;
  currentWave: number;
  totalWaves: number;
  nodeStatuses: Record<string, NodeExecutionStatus>;
  nodeResults: Record<string, string[]>; // nodeId -> preview image URLs
  errors: Array<{ nodeId: string; batchIndex: number; error: string }>;
  batchProgress: { completed: number; total: number };
  eventSource: EventSource | null;
  batchResults: Array<{ url: string; size?: string }>;
  showResults: boolean;

  startExecution: (runId: string, batchCount: number) => void;
  handleSSEEvent: (event: SSEEvent) => void;
  reset: () => void;
  cancel: () => void;
  setShowResults: (show: boolean) => void;
}

function extractImageUrls(outputs: Record<string, unknown>): string[] {
  const urls: string[] = [];
  for (const val of Object.values(outputs)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
          urls.push(item.url);
          if (urls.length >= 5) return urls;
        }
      }
    }
  }
  return urls;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isRunning: false,
  runId: null,
  currentWave: 0,
  totalWaves: 0,
  nodeStatuses: {},
  nodeResults: {},
  errors: [],
  batchProgress: { completed: 0, total: 1 },
  eventSource: null,
  batchResults: [],
  showResults: false,

  startExecution: (runId: string, batchCount: number) => {
    // Close existing connection if any
    get().eventSource?.close();

    const es = new EventSource(`http://localhost:3000/api/executions/${runId}/events`);
    es.onmessage = (msg) => {
      try {
        const event: SSEEvent = JSON.parse(msg.data);
        get().handleSSEEvent(event);
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = () => {
      // SSE will auto-reconnect; if the run completes, the server stops sending
    };

    set({
      isRunning: true,
      runId,
      currentWave: 0,
      totalWaves: 0,
      nodeStatuses: {},
      nodeResults: {},
      errors: [],
      batchProgress: { completed: 0, total: batchCount },
      batchResults: [],
      showResults: false,
      eventSource: es,
    });
  },

  handleSSEEvent: (event: SSEEvent) => {
    const state = get();

    switch (event.type) {
      case "wave-start":
        set({ currentWave: event.waveIndex, totalWaves: event.totalWaves });
        break;

      case "node-start":
        set({
          nodeStatuses: {
            ...state.nodeStatuses,
            [event.nodeId]: "running",
          },
        });
        break;

      case "node-complete": {
        const outputs = event.outputs as Record<string, unknown> | undefined;
        const urls = outputs ? extractImageUrls(outputs) : [];
        const newState: Partial<ExecutionState> = {
          nodeStatuses: {
            ...state.nodeStatuses,
            [event.nodeId]: "completed",
          },
          nodeResults: {
            ...state.nodeResults,
            [event.nodeId]: [...(state.nodeResults[event.nodeId] ?? []), ...urls],
          },
        };
        if (outputs?.exported) {
          const exported = outputs.exported as Array<{ url: string; size?: string }>;
          newState.batchResults = [...state.batchResults, ...exported];
        }
        set(newState);
        break;
      }

      case "node-error":
        set({
          nodeStatuses: {
            ...state.nodeStatuses,
            [event.nodeId]: "failed",
          },
          errors: [
            ...state.errors,
            {
              nodeId: event.nodeId,
              batchIndex: event.batchIndex,
              error: event.error,
            },
          ],
        });
        break;

      case "batch-complete":
        set({
          batchProgress: {
            completed: event.batchIndex + 1,
            total: state.batchProgress.total,
          },
        });
        break;

      case "run-complete":
        state.eventSource?.close();
        set({ isRunning: false, eventSource: null, showResults: true });
        break;

      case "run-error":
        state.eventSource?.close();
        set({ isRunning: false, eventSource: null });
        break;
    }
  },

  reset: () => {
    get().eventSource?.close();
    set({
      isRunning: false,
      runId: null,
      currentWave: 0,
      totalWaves: 0,
      nodeStatuses: {},
      nodeResults: {},
      errors: [],
      batchProgress: { completed: 0, total: 1 },
      eventSource: null,
    });
  },

  cancel: () => {
    const state = get();
    if (state.runId) {
      fetch(`http://localhost:3000/api/executions/${state.runId}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    state.eventSource?.close();
    set({ isRunning: false, eventSource: null });
  },

  setShowResults: (show) => set({ showResults: show }),
}));
