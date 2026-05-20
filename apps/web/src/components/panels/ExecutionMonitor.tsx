import { useExecutionStore } from "../../store/executionStore";
import { useWorkflowStore } from "../../store/workflowStore";
import { Play, Square, Loader2, Check, X, ChevronUp } from "lucide-react";

export function ExecutionMonitor() {
  const isRunning = useExecutionStore((s) => s.isRunning);
  const currentWave = useExecutionStore((s) => s.currentWave);
  const totalWaves = useExecutionStore((s) => s.totalWaves);
  const nodeStatuses = useExecutionStore((s) => s.nodeStatuses);
  const errors = useExecutionStore((s) => s.errors);
  const cancel = useExecutionStore((s) => s.cancel);
  const nodes = useWorkflowStore((s) => s.nodes);

  if (!isRunning && Object.keys(nodeStatuses).length === 0 && errors.length === 0) {
    return null;
  }

  return (
    <div className="h-10 shrink-0 bg-[#141414] border-t border-[#2a2a2a] flex items-center justify-between px-4 text-xs">
      <div className="flex items-center gap-3">
        {isRunning ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
        ) : (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className="text-zinc-400">
          {isRunning
            ? `Wave ${currentWave + 1}/${totalWaves || "?"}`
            : "Run complete"}
        </span>

        {/* Per-node status mini-dots */}
        {nodes.map((n) => {
          const s = nodeStatuses[n.id];
          return (
            <span key={n.id} className="flex items-center gap-1 text-zinc-500">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  s === "running"
                    ? "bg-yellow-400 animate-pulse"
                    : s === "completed"
                    ? "bg-emerald-400"
                    : s === "failed"
                    ? "bg-red-400"
                    : "bg-zinc-700"
                }`}
              />
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {errors.length > 0 && (
          <span className="text-red-400" title={errors.map((e) => `${e.nodeId}: ${e.error}`).join("\n")}>
            {errors.length} error{errors.length > 1 ? "s" : ""}
          </span>
        )}
        {isRunning && (
          <button
            onClick={cancel}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-900 text-red-300 transition-colors"
          >
            <Square className="w-3 h-3" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
