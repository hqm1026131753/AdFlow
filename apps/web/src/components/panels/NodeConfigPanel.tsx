import { useState, useRef } from "react";
import { useWorkflowStore } from "../../store/workflowStore";
import { useExecutionStore } from "../../store/executionStore";
import { NODE_TYPE_REGISTRY, type ConfigFieldMeta } from "@ad-flow/shared";
import { Trash2, Play, Loader2, Upload, X } from "lucide-react";

export function NodeConfigPanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const removeSelectedNodes = useWorkflowStore((s) => s.removeSelectedNodes);

  const [generating, setGenerating] = useState(false);
  const [refImages, setRefImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  if (!selectedNode) return null;

  const node = selectedNode;
  const def = NODE_TYPE_REGISTRY[node.data.nodeType];
  if (!def) return null;

  const config = node.data.config as Record<string, unknown>;
  const metaList = def.configMeta ?? [];
  const nodeId = node.id;
  const isImage = node.data.nodeType === "image-generator";

  const update = (key: string, value: unknown) => {
    updateNodeConfig(nodeId, { ...config, [key]: value });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    useExecutionStore.setState({
      nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [nodeId]: "running" },
    });

    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    const count = (config.count as number) ?? (isImage ? 4 : 3);
    let urls: string[];

    if (isImage) {
      const [w, h] = ((config.aspectRatio as string) ?? "1:1").split(":").map(Number);
      urls = Array.from({ length: count }, (_, i) =>
        `https://picsum.photos/seed/gen-${Date.now()}-${i}/${w! * 200}/${h! * 200}`
      );
    } else {
      urls = Array.from({ length: count }, (_, i) =>
        `https://picsum.photos/seed/text-${Date.now()}-${i}/400/200`
      );
    }

    useExecutionStore.setState({
      nodeStatuses: { ...useExecutionStore.getState().nodeStatuses, [nodeId]: "completed" },
      nodeResults: { ...useExecutionStore.getState().nodeResults, [nodeId]: urls },
    });

    setGenerating(false);
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

  function renderField(meta: ConfigFieldMeta) {
    const value = config[meta.key] ?? meta.defaultValue;
    const id = `${nodeId}-${meta.key}`;

    switch (meta.type) {
      case "text":
        return (
          <input
            id={id}
            type="text"
            value={value as string}
            onChange={(e) => update(meta.key, e.target.value)}
            className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50 w-full font-mono"
          />
        );

      case "slider": {
        const min = meta.min ?? 0;
        const max = meta.max ?? 1;
        const step = meta.step ?? 1;
        const pct = ((Number(value) - min) / (max - min)) * 100;
        return (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={Number(value)}
              onChange={(e) => update(meta.key, parseInt(e.target.value, 10))}
              className="flex-1 h-1 accent-violet-500"
              style={{ background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${pct}%, #2a2a2a ${pct}%, #2a2a2a 100%)` }}
            />
            <span className="text-xs text-zinc-500 w-8 text-right font-mono">{value as number}</span>
          </div>
        );
      }

      case "select":
        return (
          <select
            id={id}
            value={value as string}
            onChange={(e) => update(meta.key, e.target.value)}
            className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50 w-full appearance-none cursor-pointer"
          >
            {meta.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case "boolean":
        return (
          <button
            onClick={() => update(meta.key, !value)}
            className={`w-9 h-5 rounded-full transition-colors relative ${value ? "bg-violet-500" : "bg-zinc-700"}`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                value ? "left-4.5" : "left-0.5"
              }`}
            />
          </button>
        );

      default:
        return <span className="text-xs text-zinc-600">Unknown: {meta.type}</span>;
    }
  }

  return (
    <div className="w-72 shrink-0 bg-[#141414] border-l border-[#2a2a2a] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: def.color }} />
            <span className="text-sm font-medium text-zinc-300">{def.displayName}</span>
          </div>
          <button
            onClick={removeSelectedNodes}
            className="text-zinc-600 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Generate button - prominent */}
      <div className="p-3 border-b border-[#2a2a2a]">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium transition-colors"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Generate
            </>
          )}
        </button>
      </div>

      {/* Config fields */}
      <div className="p-3 flex flex-col gap-3.5 flex-1">
        {/* Reference image upload (image-generator only) */}
        {isImage && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">参考图</label>
            {refImages.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-1">
                {refImages.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} className="w-12 h-12 rounded object-cover border border-[#2a2a2a]" />
                    <button
                      onClick={() => setRefImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-zinc-300" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUploadRef}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2 rounded-md border border-dashed border-[#2a2a2a] hover:border-violet-500/30 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              上传参考图 ({refImages.length}/10)
            </button>
          </div>
        )}

        {metaList.map((meta) => (
          <div key={meta.key} className="flex flex-col gap-1.5">
            <label htmlFor={`${node.id}-${meta.key}`} className="text-xs text-zinc-400 font-medium">
              {meta.label}
            </label>
            {renderField(meta)}
            {meta.description && (
              <p className="text-xs text-zinc-600 leading-tight">{meta.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Node info footer */}
      <div className="mt-auto p-3 border-t border-[#2a2a2a] space-y-1">
        <p className="text-xs text-zinc-600">
          ID: <span className="font-mono">{node.id.slice(0, 8)}</span>
        </p>
        <p className="text-xs text-zinc-600">
          Type: <span className="font-mono">{node.data.nodeType}</span>
        </p>
      </div>
    </div>
  );
}
