import { useCallback, useEffect } from "react";
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

function isValidConnection(connection: Edge | Connection) {
  if (connection.source === connection.target) {
    console.log("[isValidConnection] REJECT: self-connection");
    return false;
  }

  const sourceNode = useWorkflowStore.getState().nodes.find((n) => n.id === connection.source);
  const targetNode = useWorkflowStore.getState().nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode) {
    console.log("[isValidConnection] REJECT: node not found", { source: !!sourceNode, target: !!targetNode });
    return false;
  }

  const sourceDef = NODE_TYPE_REGISTRY[sourceNode.data.nodeType];
  const targetDef = NODE_TYPE_REGISTRY[targetNode.data.nodeType];
  if (!sourceDef || !targetDef) {
    console.log("[isValidConnection] REJECT: registry entry missing", {
      sourceType: sourceNode.data.nodeType, sourceDef: !!sourceDef,
      targetType: targetNode.data.nodeType, targetDef: !!targetDef,
    });
    return false;
  }

  const sourcePort = sourceDef.outputs.find(
    (p) => p.id === (connection.sourceHandle as string)
  );
  const targetPort = targetDef.inputs.find(
    (p) => p.id === (connection.targetHandle as string)
  );
  if (!sourcePort || !targetPort) {
    console.log("[isValidConnection] REJECT: port not found", {
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      sourceOutputs: sourceDef.outputs.map(p => p.id),
      targetInputs: targetDef.inputs.map(p => p.id),
    });
    return false;
  }

  console.log("[isValidConnection] port types:", {
    source: sourcePort.dataType,
    target: targetPort.dataType,
  });

  // Compatible if same type, or either side is "any"
  if (sourcePort.dataType === targetPort.dataType) {
    console.log("[isValidConnection] ACCEPT: same type");
    return true;
  }
  if (sourcePort.dataType === "any" || targetPort.dataType === "any") {
    console.log("[isValidConnection] ACCEPT: any type");
    return true;
  }
  // Single ↔ array of same base type (both directions)
  const stripArray = (t: string) => t.replace("[]", "");
  if (stripArray(sourcePort.dataType) === stripArray(targetPort.dataType)) {
    console.log("[isValidConnection] ACCEPT: stripArray match");
    return true;
  }

  console.log("[isValidConnection] REJECT: type mismatch");
  return false;
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

      // 1) Node library drag
      const nodeType = e.dataTransfer.getData("application/adflow-node-type");
      if (nodeType && IS_VALID_TYPES.includes(nodeType)) {
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        addNode(nodeType, position);
        return;
      }

      // 2) File drop from desktop → create image-source nodes
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return;

        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

        imageFiles.forEach((file, i) => {
          const url = URL.createObjectURL(file);
          const offsetX = i * 30;
          const offsetY = i * 30;
          addNode("image-source", { x: position.x + offsetX, y: position.y + offsetY });
          // addNode is synchronous via Zustand, so the last node is the one we just added
          const nodes = useWorkflowStore.getState().nodes;
          const lastNode = nodes[nodes.length - 1];
          if (lastNode) {
            useWorkflowStore.getState().updateNodeConfig(lastNode.id, {
              images: [url],
            });
          }
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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={(_event, { nodeId, handleId, handleType }) => {
          console.log("[onConnectStart]", { nodeId, handleId, handleType });
        }}
        onConnectEnd={() => {
          console.log("[onConnectEnd]");
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        isValidConnection={isValidConnection}
        connectionRadius={40}
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
    </div>
  );
}
