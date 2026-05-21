import { useCallback, useEffect, Component } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "../../store/workflowStore";
import { NODE_TYPE_REGISTRY } from "@ad-flow/shared";
import { TextGenNode, ImageGenNode } from "./nodes/BaseNode";
import { ImageSourceNode, TextSourceNode } from "./nodes/SourceNode";
import { AdScoutNode } from "./nodes/AdScoutNode";

const nodeTypes = {
  "text-generator": TextGenNode,
  "image-generator": ImageGenNode,
  "image-source": ImageSourceNode,
  "text-source": TextSourceNode,
  "ad-reference-search": AdScoutNode,
};

const IS_VALID_TYPES = Object.keys(NODE_TYPE_REGISTRY);

class FlowErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error("[FlowCanvas] Caught error:", error.message, error.stack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center" style={{ height: "100%" }}>
          <div className="bg-[#141414] border border-red-900/50 rounded-xl p-6 max-w-md text-center">
            <p className="text-red-400 font-semibold mb-2">Canvas Error</p>
            <p className="text-xs text-zinc-500 mb-3">The canvas encountered an error and recovered.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm text-white"
            >
              Reload Canvas
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function isValidConnection(connection: Edge | Connection) {
  // No self-connections
  if (connection.source === connection.target) return false;

  const sourceNode = useWorkflowStore.getState().nodes.find((n) => n.id === connection.source);
  const targetNode = useWorkflowStore.getState().nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;

  const sourceDef = NODE_TYPE_REGISTRY[sourceNode.data.nodeType];
  const targetDef = NODE_TYPE_REGISTRY[targetNode.data.nodeType];
  if (!sourceDef || !targetDef) return false;

  // Loose connection — handle may not be specified; accept any compatible pair
  const sourceHandle = connection.sourceHandle as string | undefined;
  const targetHandle = connection.targetHandle as string | undefined;

  if (sourceHandle && targetHandle) {
    const sourcePort = sourceDef.outputs.find((p) => p.id === sourceHandle);
    const targetPort = targetDef.inputs.find((p) => p.id === targetHandle);
    if (!sourcePort || !targetPort) return false;
  }

  return true;
}

export function FlowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
  } = useWorkflowStore();

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Accept both node-library drags and file drops
    if (e.dataTransfer.types.includes("application/adflow-node-type")) {
      e.dataTransfer.dropEffect = "move";
    } else if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      // 1) Node library drag — defer to avoid React 19 + ReactFlow DOM race
      const nodeType = e.dataTransfer.getData("application/adflow-node-type");
      if (nodeType && IS_VALID_TYPES.includes(nodeType)) {
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        requestAnimationFrame(() => {
          addNode(nodeType, position);
        });
        return;
      }

      // 2) File drop from desktop → create image-source nodes
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return;

        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

        requestAnimationFrame(() => {
          imageFiles.forEach((file, i) => {
            const url = URL.createObjectURL(file);
            const offsetX = i * 30;
            const offsetY = i * 30;
            useWorkflowStore.getState().addNode("image-source", { x: position.x + offsetX, y: position.y + offsetY });
            const nodes = useWorkflowStore.getState().nodes;
            const lastNode = nodes[nodes.length - 1];
            if (lastNode) {
              useWorkflowStore.getState().updateNodeConfig(lastNode.id, {
                images: [url],
              });
            }
          });
        });
      }
    },
    [addNode, screenToFlowPosition]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Keyboard shortcuts: Delete/Backspace to remove selected node, Escape to deselect
  const removeSelectedNodes = useWorkflowStore((s) => s.removeSelectedNodes);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId && document.activeElement === document.body) {
          e.preventDefault();
          removeSelectedNodes();
        }
      }
      if (e.key === "Escape") {
        selectNode(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNodeId, removeSelectedNodes, selectNode, undo, redo]);

  // Save undo checkpoint on drag stop
  const saveHistory = useWorkflowStore((s) => s.saveHistory);
  const onNodeDragStop = useCallback(() => {
    saveHistory();
  }, [saveHistory]);

  return (
    <div className="flex-1" style={{ height: "100%" }}>
      <FlowErrorBoundary>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          isValidConnection={isValidConnection}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={60}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            style: { stroke: "#a78bfa", strokeWidth: 2 },
          }}
        >
          <Controls className="!bg-[#141414] !border-[#2a2a2a] !rounded-lg !overflow-hidden" />
          <MiniMap
            className="!bg-[#141414] !border-[#2a2a2a] !rounded-lg"
            maskColor="rgba(0,0,0,0.6)"
            nodeColor={(n) => {
              const def = NODE_TYPE_REGISTRY[(n as Node).type ?? ""];
              return def?.color ?? "#333";
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#222" />
        </ReactFlow>
      </FlowErrorBoundary>
    </div>
  );
}
