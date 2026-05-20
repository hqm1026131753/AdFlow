import { useCallback, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_TYPE_REGISTRY } from "@ad-flow/shared";
import { useWorkflowStore, type AdFlowNode } from "../../../store/workflowStore";
import { useExecutionStore } from "../../../store/executionStore";
import { api } from "../../../api/client";
import { Search, Loader2 } from "lucide-react";

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

export function AdScoutNode({ id, data, selected }: NodeProps<AdFlowNode>) {
  const def = NODE_TYPE_REGISTRY[data.nodeType];
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const status = useExecutionStore((s) => s.nodeStatuses[id]) || "idle";

  const [searching, setSearching] = useState(false);

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
    const platform = (config.platform as string) ?? "pinterest";
    const count = (config.count as number) ?? 10;

    if (!keywords.trim()) return;

    setSearching(true);
    useExecutionStore.setState({
      nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [id]: "running" },
    });

    try {
      const result = await api.scout.search({ keywords, platform, count });

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
        className={`bg-[#1a1a1a] rounded-xl ${ringColor} cursor-pointer hover:ring-zinc-500/50 transition-shadow group/node`}
      >
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
          className="flex items-center gap-2 px-3 py-2 rounded-t-xl"
          style={{ backgroundColor: `${def.color}15` }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ backgroundColor: `${def.color}25` }}
          >
            <Search className="w-3 h-3" color={def.color} />
          </div>
          <span className="text-xs font-medium text-zinc-300 flex-1">{def.displayName}</span>
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
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-[#141414] rounded-xl border border-[#2a2a2a] shadow-2xl shadow-black/60 z-50 flex flex-col gap-3 p-4"
          style={{ width: 480 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Keywords input — no border */}
          <textarea
            value={(config.keywords as string) ?? ""}
            onChange={(e) => update("keywords", e.target.value)}
            placeholder="输入关键词，如 summer dress ad, sneaker campaign, skincare banner..."
            rows={3}
            className="w-full bg-transparent px-0 py-1 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none font-mono resize-none"
          />

          {/* Controls row */}
          <div className="flex items-center gap-2">
            {/* Platform */}
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

            <div className="flex-1" />

            {/* Count */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const cur = (config.count as number) ?? 10;
                  const min = metaList.find((m) => m.key === "count")?.min ?? 4;
                  if (cur > min) update("count", cur - 2);
                }}
                className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-300 text-sm transition-colors"
              >
                −
              </button>
              <span className="text-sm text-zinc-300 w-6 text-center font-mono tabular-nums">
                {config.count as number}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const cur = (config.count as number) ?? 10;
                  const max = metaList.find((m) => m.key === "count")?.max ?? 50;
                  if (cur < max) update("count", cur + 2);
                }}
                className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-300 text-sm transition-colors"
              >
                +
              </button>
            </div>

            {/* Search button */}
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
          </div>
        </div>
      )}
    </div>
  );
}
