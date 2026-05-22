import { memo, useCallback, useState, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_TYPE_REGISTRY } from "@ad-flow/shared";
import { useWorkflowStore, type AdFlowNode } from "../../../store/workflowStore";
import { useExecutionStore } from "../../../store/executionStore";
import { api } from "../../../api/client";
import { Search, Loader2, Plus, X } from "lucide-react";

const HANDLE_STYLE: React.CSSProperties = {
  width: 14,
  height: 14,
  background: "rgba(139, 92, 246, 0.25)",
  border: "1px solid rgba(139, 92, 246, 0.5)",
  borderRadius: "50%",
};

const PLACEHOLDER_SIZE = 160;
const COLUMNS = 4;
const SPACING_X = 210;
const SPACING_Y = 210;

export const AdScoutNode = memo(function AdScoutNode({ id, data, selected }: NodeProps<AdFlowNode>) {
  const def = NODE_TYPE_REGISTRY[data.nodeType];
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const updateNodeLabel = useWorkflowStore((s) => s.updateNodeLabel);
  const status = useExecutionStore((s) => s.nodeStatuses[id]) || "idle";

  const [searching, setSearching] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [refImages, setRefImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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

  if (!def) return null;

  const config = (data.config as Record<string, unknown>) ?? {};
  const metaList = def.configMeta ?? [];
  const isRunning = status === "running" || searching;

  const update = (key: string, value: unknown) => {
    updateNodeConfig(id, { ...config, [key]: value });
  };

  const onClick = useCallback(() => {
    selectNode(id);
  }, [selectNode, id]);

  const handleSearch = async () => {
    const keywords = (config.keywords as string) ?? "";
    const source = (config.source as string) ?? "stock";
    const platform = (config.platform as string) ?? "pinterest";

    if (!keywords.trim()) return;

    setSearching(true);
    useExecutionStore.setState({
      nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [id]: "running" },
    });

    try {
      const result = await api.scout.search({ keywords, source, platform });

      // Get Ad Scout's current position on the canvas
      const scoutNode = useWorkflowStore.getState().nodes.find((n) => n.id === id);
      const baseX = scoutNode ? scoutNode.position.x : 0;
      const baseY = scoutNode ? scoutNode.position.y : 0;

      const { addNode, updateNodeConfig: updateCfg } = useWorkflowStore.getState();

      // Spawn image-source nodes in a grid below/right of the Ad Scout
      result.references.forEach((ref, i) => {
        const col = i % COLUMNS;
        const row = Math.floor(i / COLUMNS);
        addNode("image-source", {
          x: baseX + 220 + col * SPACING_X,
          y: baseY + row * SPACING_Y,
        });
        const newNode = useWorkflowStore.getState().nodes[useWorkflowStore.getState().nodes.length - 1];
        if (newNode) {
          updateCfg(newNode.id, {
            images: [ref.url],
            meta: { source: ref.source, sourceUrl: ref.sourceUrl, overall: ref.overall, reason: ref.reason },
          });
        }
      });

      useExecutionStore.setState({
        nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [id]: "completed" },
      });
    } catch (err) {
      console.warn("[AdScout] Search failed:", err);
      useExecutionStore.setState({
        nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [id]: "failed" },
      });
    } finally {
      setSearching(false);
    }
  };

  const ringColor = selected
    ? "ring-2 ring-white/40"
    : isRunning
    ? "ring-1 ring-orange-400/50"
    : "ring-1 ring-zinc-700/50";

  return (
    <div className="relative overflow-visible">
      {/* ── Card ── */}
      <div
        onClick={onClick}
        className={`bg-[#1a1a1a] rounded-2xl ${ringColor} cursor-pointer hover:ring-zinc-500/50 transition-shadow group/node`}
      >
        {/* Input handles */}
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
        {/* Output handles */}
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
            <Search className="w-3 h-3" color={def.color} />
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
          <div
            className={`w-2 h-2 rounded-full ${
              isRunning ? "bg-orange-400 animate-pulse" : status === "completed" ? "bg-emerald-400" : status === "failed" ? "bg-red-400" : "bg-zinc-600"
            }`}
          />
        </div>

        {/* Body: always shows search placeholder */}
        <div className="px-3 pb-3 pt-2 flex justify-center">
          <div
            className="rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center"
            style={{ width: PLACEHOLDER_SIZE, height: PLACEHOLDER_SIZE }}
          >
            {isRunning ? (
              <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            ) : (
              <div className="flex flex-col items-center gap-2 opacity-30">
                <Search className="w-10 h-10 text-zinc-500" />
                <span className="text-xs text-zinc-600">Ad Scout</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating config dialog ── */}
      {selected && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-[#141414] rounded-2xl border border-[#2a2a2a] shadow-2xl shadow-black/60 z-50 flex flex-col gap-3 p-4"
          style={{ width: 480 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Reference images upload */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/40 flex items-center justify-center shrink-0 transition-colors"
              title="添加参考图"
            >
              <Plus className="w-4 h-4 text-orange-400" />
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

          {/* Keywords input — no border */}
          <textarea
            value={(config.keywords as string) ?? ""}
            onChange={(e) => update("keywords", e.target.value)}
            placeholder={"输入搜索指令，用自然语言指定数量\n找5张防晒霜广告参考图\n3 photos of sneaker ads\nsummer dress ad"}
            rows={3}
            className="w-full bg-transparent px-0 py-1 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none font-mono resize-none"
          />

          {/* Source selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 shrink-0">搜索来源</span>
            <select
              value={(config.source as string) ?? "stock"}
              onChange={(e) => update("source", e.target.value)}
              className="bg-transparent text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer focus:outline-none appearance-none transition-colors"
            >
              {metaList
                .find((m) => m.key === "source")
                ?.options?.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#141414] text-zinc-300">
                    {opt.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            {/* Platform — only shown for social mode */}
            {(config.source as string) === "social" && (
              <select
                value={(config.platform as string) ?? "pinterest"}
                onChange={(e) => update("platform", e.target.value)}
                className="bg-transparent text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer focus:outline-none appearance-none transition-colors"
              >
                {metaList
                  .find((m) => m.key === "platform")
                  ?.options?.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#141414] text-zinc-300">
                      {opt.label}
                    </option>
                  ))}
              </select>
            )}

            {/* Stock mode hint */}
            {(config.source as string) !== "social" && (config.source as string) !== "manual" && (
              <span className="text-xs text-zinc-600">Unsplash · Pexels · Pixabay</span>
            )}

            {/* Manual mode hint */}
            {(config.source as string) === "manual" && (
              <span className="text-xs text-zinc-500">待用户粘贴链接</span>
            )}

            <div className="flex-1" />

            {/* Search button — hidden in manual mode */}
            {(config.source as string) !== "manual" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSearch();
                }}
                disabled={searching}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-sm text-white font-medium shrink-0 transition-colors"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Scout
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
