import { useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_TYPE_REGISTRY } from "@ad-flow/shared";
import { useWorkflowStore, type AdFlowNode } from "../../../store/workflowStore";
import { Image, Type, X } from "lucide-react";

const HANDLE_STYLE: React.CSSProperties = {
  width: 14,
  height: 14,
  background: "rgba(139, 92, 246, 0.25)",
  border: "1px solid rgba(139, 92, 246, 0.5)",
  borderRadius: "50%",
};

export function SourceNode({ id, data, selected }: NodeProps<AdFlowNode>) {
  const def = NODE_TYPE_REGISTRY[data.nodeType];
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);

  if (!def) return null;

  const config = (data.config as Record<string, unknown>) ?? {};
  const isImageSource = data.nodeType === "image-source";
  const images = (config.images as string[]) ?? [];

  const onClick = useCallback(() => {
    selectNode(id);
  }, [selectNode, id]);

  const removeImage = (i: number) => {
    updateNodeConfig(id, { ...config, images: images.filter((_, j) => j !== i) });
  };

  const ringColor = selected
    ? "ring-2 ring-white/40"
    : "ring-1 ring-zinc-700/50";

  return (
    <div
      onClick={onClick}
      className={`bg-[#1a1a1a] rounded-xl ${ringColor} cursor-pointer hover:ring-zinc-500/50 transition-shadow overflow-visible group/node`}
    >
      {/* Handles — output only */}
      {def.outputs.map((port) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={HANDLE_STYLE}
          className="!opacity-0 group-hover/node:!opacity-100 transition-opacity"
        />
      ))}

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-xl"
        style={{ backgroundColor: `${def.color}15` }}
      >
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ backgroundColor: `${def.color}25` }}
        >
          {def.icon === "type" ? (
            <Type className="w-3 h-3" color={def.color} />
          ) : (
            <Image className="w-3 h-3" color={def.color} />
          )}
        </div>
        <span className="text-xs font-medium text-zinc-300 flex-1">{def.displayName}</span>
      </div>

      {/* Body */}
      <div className="px-3 pb-3 pt-2 flex justify-center">
        {isImageSource ? (
          images.length > 0 ? (
            <div
              className="rounded-lg overflow-hidden grid gap-0.5"
              style={{
                width: 160,
                height: 160,
                gridTemplateColumns: images.length === 1 ? "1fr" : "repeat(2, 1fr)",
                gridTemplateRows: images.length === 1 ? "1fr" : `repeat(${Math.ceil(images.length / 2)}, 1fr)`,
              }}
            >
              {images.slice(0, 4).map((url, i) => (
                <div key={i} className="relative group/img">
                  <img src={url} alt={`Source ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(i);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-800/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-zinc-300" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-lg bg-[#1e1e1e] border border-dashed border-[#2a2a2a] flex items-center justify-center"
              style={{ width: 160, height: 160 }}
            >
              <div className="flex flex-col items-center gap-2 opacity-30">
                <Image className="w-10 h-10 text-zinc-500" />
                <span className="text-xs text-zinc-600">Drop image</span>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2" style={{ width: 160 }}>
            <textarea
              value={(config.text as string) ?? ""}
              onChange={(e) => updateNodeConfig(id, { ...config, text: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="输入文本内容..."
              rows={4}
              className="bg-transparent px-0 py-1 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none w-full resize-none font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ImageSourceNode(props: NodeProps) {
  return <SourceNode {...(props as NodeProps<AdFlowNode>)} />;
}
export function TextSourceNode(props: NodeProps) {
  return <SourceNode {...(props as NodeProps<AdFlowNode>)} />;
}
