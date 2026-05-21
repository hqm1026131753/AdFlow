import { memo, useCallback, useState, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_TYPE_REGISTRY } from "@ad-flow/shared";
import { useWorkflowStore, type AdFlowNode } from "../../../store/workflowStore";
import { useExecutionStore } from "../../../store/executionStore";
import { api } from "../../../api/client";
import { Type, Image, Loader2, Play, X, Plus } from "lucide-react";

const HANDLE_STYLE: React.CSSProperties = {
  width: 14,
  height: 14,
  background: "rgba(139, 92, 246, 0.25)",
  border: "1px solid rgba(139, 92, 246, 0.5)",
  borderRadius: "50%",
};

const PLACEHOLDER_SIZE = 160;
const MAX_IMG_WIDTH = 200;

function AdaptiveImage({ url }: { url: string }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const displayW = dims ? Math.min(dims.w, MAX_IMG_WIDTH) : MAX_IMG_WIDTH;
  const displayH = dims
    ? Math.round((displayW / dims.w) * dims.h)
    : Math.round(MAX_IMG_WIDTH * 0.75);

  return (
    <img
      src={url}
      alt="Result"
      onLoad={(e) => {
        const img = e.currentTarget;
        setDims({ w: img.naturalWidth, h: img.naturalHeight });
      }}
      className="rounded-lg object-contain bg-[#1e1e1e]"
      style={{ width: displayW, height: displayH }}
    />
  );
}

function PlaceholderSquare({
  nodeType,
  results,
  isRunning,
}: {
  nodeType: string;
  results?: string[];
  isRunning: boolean;
}) {
  const isImage = nodeType === "image-generator";
  const hasResults = results && results.length > 0;

  if (hasResults && isImage) {
    const count = Math.min(results.length, 4);
    return count === 1 ? (
      <AdaptiveImage url={results[0]} />
    ) : (
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: count <= 2 ? `repeat(${count}, 1fr)` : "repeat(2, 1fr)",
          maxWidth: MAX_IMG_WIDTH * 2 + 4,
        }}
      >
        {results.slice(0, 4).map((url, i) => (
          <AdaptiveImage key={i} url={url} />
        ))}
      </div>
    );
  }

  if (hasResults && !isImage) {
    return (
      <div
        className="rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] p-2 overflow-y-auto flex flex-col gap-1.5"
        style={{ width: PLACEHOLDER_SIZE, height: PLACEHOLDER_SIZE }}
      >
        {results.slice(0, 5).map((text, i) => (
          <p key={i} className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{text}</p>
        ))}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center relative"
      style={{ width: PLACEHOLDER_SIZE, height: PLACEHOLDER_SIZE }}
    >
      {isRunning ? (
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      ) : isImage ? (
        <div className="flex flex-col items-center gap-2 opacity-30">
          <Image className="w-10 h-10 text-zinc-500" />
          <span className="text-xs text-zinc-600">Image</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 opacity-30">
          <Type className="w-10 h-10 text-zinc-500" />
          <span className="text-xs text-zinc-600">Text</span>
        </div>
      )}
    </div>
  );
}

export const BaseNode = memo(function BaseNode({ id, data, selected }: NodeProps<AdFlowNode>) {
  const def = NODE_TYPE_REGISTRY[data.nodeType];
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const updateNodeLabel = useWorkflowStore((s) => s.updateNodeLabel);
  const execStatus = useExecutionStore((s) => s.nodeStatuses[id]);
  const nodeResults = useExecutionStore((s) => s.nodeResults[id]);
  const status = execStatus || "idle";

  const [generating, setGenerating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [refImages, setRefImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const config = (data.config as Record<string, unknown>) ?? {};
  const metaList = def?.configMeta ?? [];
  const isImage = data.nodeType === "image-generator";
  const isRunning = status === "running" || generating;

  const onClick = useCallback(() => {
    selectNode(id);
  }, [selectNode, id]);

  if (!def) return null;

  const update = (key: string, value: unknown) => {
    updateNodeConfig(id, { ...config, [key]: value });
  };

  const handleGenerate = async () => {
    const prompt = (config.prompt as string) ?? "";
    if (!prompt.trim()) return;

    setGenerating(true);
    useExecutionStore.setState({
      nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [id]: "running" },
    });

    try {
      const result = await api.generate.run({
        nodeType: data.nodeType,
        config,
        inputs: {}, // TODO: gather from connected nodes
      });

      if (isImage) {
        const images = result.images ?? [];
        useExecutionStore.setState({
          nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [id]: "completed" },
          nodeResults: { ...useExecutionStore.getState().nodeResults, [id]: images },
        });
      } else {
        const texts = result.texts ?? [];
        useExecutionStore.setState({
          nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [id]: "completed" },
          nodeResults: { ...useExecutionStore.getState().nodeResults, [id]: texts },
        });
      }
    } catch (err) {
      console.warn("[BaseNode] Generate failed:", err);
      useExecutionStore.setState({
        nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [id]: "failed" },
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: string[] = [];
    let loaded = 0;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newImages.push(reader.result as string);
        loaded++;
        if (loaded === files.length) {
          setRefImages((prev) => [...prev, ...newImages].slice(0, 10));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const inputDefs = def.inputs;
  const outputDefs = def.outputs;

  const ringColor = selected
    ? "ring-2 ring-white/40"
    : isRunning
    ? "ring-1 ring-yellow-400/50"
    : "ring-1 ring-zinc-700/50";

  return (
    <div className="relative overflow-visible">
      {/* ── Visual card (fixed size) ── */}
      <div
        onClick={onClick}
        className={`bg-[#1a1a1a] rounded-xl ${ringColor} cursor-pointer hover:ring-zinc-500/50 transition-shadow group/node`}
      >
        {/* Handles — ReactFlow positions them at node edges; hover reveals them */}
        {inputDefs.map((port) => (
          <Handle
            key={port.id}
            type="target"
            position={Position.Left}
            id={port.id}
            style={HANDLE_STYLE}
            className="!opacity-0 group-hover/node:!opacity-100 transition-opacity"
          />
        ))}
        {outputDefs.map((port) => (
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
              title="双击重命名"
            >
              {data.label || def.displayName}
            </span>
          )}
          <div
            className={`w-2 h-2 rounded-full ${
              isRunning ? "bg-yellow-400 animate-pulse" : status === "completed" ? "bg-emerald-400" : status === "failed" ? "bg-red-400" : "bg-zinc-600"
            }`}
          />
        </div>

        {/* Body: placeholder */}
        <div className="px-3 pb-3 pt-2 flex justify-center">
          <PlaceholderSquare nodeType={data.nodeType} results={nodeResults} isRunning={isRunning} />
        </div>
      </div>

      {/* ── Floating config dialog (appears below the card when selected) ── */}
      {selected && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-[#141414] rounded-xl border border-[#2a2a2a] shadow-2xl shadow-black/60 z-50 flex flex-col gap-3 p-4"
          style={{ width: 480 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top-left: add reference button (image only) */}
          {isImage && (
            <div className="flex gap-2 items-center">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 flex items-center justify-center shrink-0 transition-colors"
                title="添加参考图"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUploadRef} className="hidden" />
              {refImages.length > 0 ? (
                <div className="flex gap-1.5">
                  {refImages.map((url, i) => (
                    <div key={i} className="relative group/img w-10 h-10 shrink-0">
                      <img src={url} className="w-full h-full rounded-lg object-cover border border-[#2a2a2a]" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRefImages((prev) => prev.filter((_, j) => j !== i));
                        }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5 text-zinc-300" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-zinc-600">添加参考图</span>
              )}
            </div>
          )}

          {/* Prompt — textarea takes most space, no border */}
          <textarea
            value={(config.prompt as string) ?? ""}
            onChange={(e) => update("prompt", e.target.value)}
            placeholder={isImage ? "描述你想生成的图片内容和风格..." : "描述你想生成的文案内容和风格..."}
            rows={3}
            className="w-full bg-transparent px-0 py-1 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none font-mono resize-none"
          />

          {/* Controls row — borderless */}
          <div className="flex items-center gap-2">
            <select
              value={(config.model as string) ?? ""}
              onChange={(e) => update("model", e.target.value)}
              className="bg-transparent text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer focus:outline-none appearance-none min-w-0 flex-1 transition-colors"
            >
              {metaList
                .find((m) => m.key === "model")
                ?.options?.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#141414] text-zinc-300">
                    {opt.label}
                  </option>
                ))}
            </select>

            {isImage && (
              <>
                <select
                  value={(config.aspectRatio as string) ?? "1:1"}
                  onChange={(e) => update("aspectRatio", e.target.value)}
                  className="bg-transparent text-sm text-zinc-500 hover:text-zinc-300 cursor-pointer focus:outline-none appearance-none transition-colors"
                >
                  {metaList
                    .find((m) => m.key === "aspectRatio")
                    ?.options?.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#141414] text-zinc-300">
                        {opt.value}
                      </option>
                    ))}
                </select>
                <select
                  value={(config.quality as string) ?? "hd"}
                  onChange={(e) => update("quality", e.target.value)}
                  className="bg-transparent text-sm text-zinc-500 hover:text-zinc-300 cursor-pointer focus:outline-none appearance-none transition-colors"
                >
                  {metaList
                    .find((m) => m.key === "quality")
                    ?.options?.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#141414] text-zinc-300">
                        {opt.value.toUpperCase()}
                      </option>
                    ))}
                </select>
              </>
            )}

            <div className="flex-1" />

            {/* Count — borderless */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const cur = (config.count as number) ?? 1;
                  const min = metaList.find((m) => m.key === "count")?.min ?? 1;
                  if (cur > min) update("count", cur - 1);
                }}
                className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-300 text-sm transition-colors"
              >
                −
              </button>
              <span className="text-sm text-zinc-300 w-5 text-center font-mono tabular-nums">
                {config.count as number}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const cur = (config.count as number) ?? 1;
                  const max = metaList.find((m) => m.key === "count")?.max ?? 20;
                  if (cur < max) update("count", cur + 1);
                }}
                className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-300 text-sm transition-colors"
              >
                +
              </button>
            </div>

            {/* Credits */}
            <span className="text-xs text-amber-400/50 font-mono tabular-nums shrink-0">
              ⚡{(config.count as number) ?? 1}
            </span>

            {/* Play */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerate();
              }}
              disabled={generating}
              className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center shrink-0 transition-colors"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export const TextGenNode = memo(function TextGenNode(props: NodeProps) {
  return <BaseNode {...(props as NodeProps<AdFlowNode>)} />;
});
export const ImageGenNode = memo(function ImageGenNode(props: NodeProps) {
  return <BaseNode {...(props as NodeProps<AdFlowNode>)} />;
});
