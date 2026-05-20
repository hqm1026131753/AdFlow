import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges, type Node, type Edge, type OnNodesChange, type OnEdgesChange, type OnConnect, type Connection } from "@xyflow/react";
import { NODE_TYPE_REGISTRY, type NodeInstance } from "@ad-flow/shared";
import { api, type WorkflowListItem } from "../api/client";
import { nanoid } from "../lib/nanoid";

export type AdFlowNode = Node<{ nodeType: string; config: Record<string, unknown>; status: string }>;

interface GraphSnapshot {
  nodes: AdFlowNode[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

interface WorkflowState {
  workflowId: string | null;
  workflowName: string;
  nodes: AdFlowNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  savedWorkflows: WorkflowListItem[];
  saveStatus: "idle" | "saving" | "saved" | "error";
  showLoadDialog: boolean;
  batchItems: Array<{ index: number; label: string; productImage?: string; uploadedId?: string; file?: File }>;
  showBatchUpload: boolean;

  // Undo/redo
  history: GraphSnapshot[];
  historyIndex: number;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Canvas actions
  onNodesChange: OnNodesChange<AdFlowNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (nodeType: string, position: { x: number; y: number }) => void;
  removeSelectedNodes: () => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;

  // Persistence actions
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  newWorkflow: () => void;
  fetchWorkflowList: () => Promise<void>;
  setShowLoadDialog: (show: boolean) => void;
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
  setBatchItems: (items: WorkflowState["batchItems"]) => void;
  setShowBatchUpload: (show: boolean) => void;
  getWorkflowDef: () => { name: string; nodes: NodeInstance[]; edges: { id: string; sourceNodeId: string; sourcePortId: string; targetNodeId: string; targetPortId: string }[] };
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: null,
  workflowName: "Untitled Workflow",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  savedWorkflows: [],
  saveStatus: "idle",
  showLoadDialog: false,
  batchItems: [],
  showBatchUpload: false,

  // ── Undo/Redo ──

  history: [],
  historyIndex: -1,

  saveHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const snapshot: GraphSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;
    const snapshot = history[historyIndex];
    set({
      nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
      edges: JSON.parse(JSON.stringify(snapshot.edges)),
      historyIndex: historyIndex - 1,
      selectedNodeId: null,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const snapshot = history[historyIndex + 1];
    set({
      nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
      edges: JSON.parse(JSON.stringify(snapshot.edges)),
      historyIndex: historyIndex + 1,
      selectedNodeId: null,
    });
  },

  // ── Canvas actions ──

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as AdFlowNode[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection: Connection) => {
    get().saveHistory();
    set({ edges: addEdge(connection, get().edges) });
  },

  addNode: (nodeType: string, position: { x: number; y: number }) => {
    const def = NODE_TYPE_REGISTRY[nodeType];
    if (!def) return;

    get().saveHistory();

    const newNode: AdFlowNode = {
      id: nanoid(),
      type: nodeType,
      position,
      data: { nodeType, config: { ...def.defaultConfig }, status: "idle" },
    };

    set({ nodes: [...get().nodes, newNode] });
  },

  removeSelectedNodes: () => {
    const selected = get().selectedNodeId;
    if (!selected) return;
    get().saveHistory();
    set({
      nodes: get().nodes.filter((n) => n.id !== selected),
      edges: get().edges.filter((e) => e.source !== selected && e.target !== selected),
      selectedNodeId: null,
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  updateNodeConfig: (nodeId, config) => {
    get().saveHistory();
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
      ),
    });
  },

  // ── Persistence actions ──

  getWorkflowDef: () => {
    const state = get();
    return {
      name: state.workflowName,
      nodes: state.nodes.map((n) => ({
        id: n.id,
        nodeType: n.data.nodeType,
        position: n.position,
        config: n.data.config,
      })),
      edges: state.edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.source,
        sourcePortId: (e.sourceHandle as string) ?? "",
        targetNodeId: e.target,
        targetPortId: (e.targetHandle as string) ?? "",
      })),
    };
  },

  saveWorkflow: async () => {
    const state = get();
    set({ saveStatus: "saving" });
    try {
      const def = state.getWorkflowDef();
      if (state.workflowId) {
        await api.workflows.update(state.workflowId, def);
        set({ saveStatus: "saved" });
      } else {
        const created = await api.workflows.create(def);
        set({ workflowId: created.id, saveStatus: "saved" });
      }
      setTimeout(() => {
        if (get().saveStatus === "saved") set({ saveStatus: "idle" });
      }, 2000);
    } catch (err) {
      console.error("Save failed:", err);
      set({ saveStatus: "error" });
    }
  },

  loadWorkflow: async (id: string) => {
    try {
      const wf = await api.workflows.get(id);
      const loadedNodes: AdFlowNode[] = wf.nodes.map((n) => ({
        id: n.id,
        type: n.nodeType,
        position: n.position,
        data: { nodeType: n.nodeType, config: n.config ?? {}, status: "idle" },
      }));
      const loadedEdges: Edge[] = wf.edges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        sourceHandle: e.sourcePortId,
        target: e.targetNodeId,
        targetHandle: e.targetPortId,
      }));
      set({
        workflowId: wf.id,
        workflowName: wf.name,
        nodes: loadedNodes,
        edges: loadedEdges,
        selectedNodeId: null,
        showLoadDialog: false,
        history: [],
        historyIndex: -1,
      });
    } catch (err) {
      console.error("Load failed:", err);
    }
  },

  newWorkflow: () => {
    set({
      workflowId: null,
      workflowName: "Untitled Workflow",
      nodes: [],
      edges: [],
      selectedNodeId: null,
      saveStatus: "idle",
      history: [],
      historyIndex: -1,
    });
  },

  fetchWorkflowList: async () => {
    try {
      const list = await api.workflows.list();
      set({ savedWorkflows: list });
    } catch (err) {
      console.error("Fetch list failed:", err);
    }
  },

  setShowLoadDialog: (show) => set({ showLoadDialog: show }),
  setBatchItems: (items) => set({ batchItems: items }),
  setShowBatchUpload: (show) => set({ showBatchUpload: show }),
  setSaveStatus: () => {},
}));
