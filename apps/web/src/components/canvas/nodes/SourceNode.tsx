import { memo, useCallback, useState } from "react";
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

const MAX_WIDTH = 220;

function ImageCell({ url, onRemove }: { url: string; onRemove: () => void }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDims({ w: img.naturalWidth, h: img.naturalHeight });
  };

  // Calculate display dimensions preserving aspect ratio
  const displayW = dims ? Math.min(dims.w, MAX_WIDTH) : MAX_WIDTH;
  const displayH = dims
    ? Math.round((displayW / dims.w) * dims.h)
    : Math.round(MAX_WIDTH * 0.75); // fallback 4:3

  return (
    <div className="relative group/img" style={{ width: displayW, height: displayH }}>
      <img
        src={url}
        alt="Source"
        onLoad={handleLoad}
        className="w-full h-full object-contain rounded-lg bg-[#1e1e1e]"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-800/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3 text-zinc-300" />
      </button>
    </div>
  );
}

export const SourceNode = memo(function SourceNode({ id, data, selected }: NodeProps<AdFlowNode>) {
  const def = NODE_TYPE_REGISTRY[data.nodeType];
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const updateNodeLabel = useWorkflowStore((s) => s.updateNodeLabel);

  const [editingName, setEditingName] = useState(false);

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

  const isGrid = images.length > 1;

  return (
    <div
      onClick={onClick}
      className={`bg-[#1a1a1a] rounded-2xl ${ringColor} cursor-pointer hover:ring-zinc-500/50 transition-shadow overflow-visible group/node`}
      style={{ minWidth: 80 }}
    >
      {/* Handles — input + output */}
      {def.inputs.map((port) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={HANDLE_STYLE}
          className="!opacity-0 group-hover/node:!opacity-100 transition-opacity"
        />
      ))}
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
        className="flex items-center gap-2 px-3 py-2 rounded-t-2xl"
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
        {editingName ? (
          <input
            className="text-xs font-medium text-zinc-300 flex-1 bg-transparent border-b border-zinc-500 outline-none px-0.5"
            defaultValue={data.label || def.displayName}
            autoFocus
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== def.displayName) updateNodeLabel(id, v);
              else updateNodeLabel(id, "");
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setEditingName(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="text-xs font-medium text-zinc-300 flex-1 cursor-text truncate"
            onClick={(e) => {
              e.stopPropagation();
              setEditingName(true);
            }}
            title="点击重命名"
          >
            {data.label || def.displayName}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 pb-3 pt-2 flex justify-center">
        {isImageSource ? (
          images.length > 0 ? (
            isGrid ? (
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(images.length, 2)}, 1fr)`,
                  maxWidth: MAX_WIDTH * 2 + 4,
                }}
              >
                {images.slice(0, 4).map((url, i) => (
                  <ImageCell key={i} url={url} onRemove={() => removeImage(i)} />
                ))}
              </div>
            ) : (
              <ImageCell url={images[0]} onRemove={() => removeImage(0)} />
            )
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
});

export const ImageSourceNode = memo(function ImageSourceNode(props: NodeProps) {
  return <SourceNode {...(props as NodeProps<AdFlowNode>)} />;
});
export const TextSourceNode = memo(function TextSourceNode(props: NodeProps) {
  return <SourceNode {...(props as NodeProps<AdFlowNode>)} />;
});
