import { useEffect, useCallback } from "react";
import { Workflow, Save, FolderOpen, FilePlus, Check, AlertCircle, Loader2, Images, X } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore";
import { useExecutionStore } from "../../store/executionStore";

export function TopBar() {
  const workflowName = useWorkflowStore((s) => s.workflowName);
  const workflowId = useWorkflowStore((s) => s.workflowId);
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const saveStatus = useWorkflowStore((s) => s.saveStatus);
  const savedWorkflows = useWorkflowStore((s) => s.savedWorkflows);
  const showLoadDialog = useWorkflowStore((s) => s.showLoadDialog);
  const getWorkflowDef = useWorkflowStore((s) => s.getWorkflowDef);
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow);
  const fetchWorkflowList = useWorkflowStore((s) => s.fetchWorkflowList);
  const setShowLoadDialog = useWorkflowStore((s) => s.setShowLoadDialog);
  const batchItems = useWorkflowStore((s) => s.batchItems);
  const setShowBatchUpload = useWorkflowStore((s) => s.setShowBatchUpload);

  const isRunning = useExecutionStore((s) => s.isRunning);
  const startExecution = useExecutionStore((s) => s.startExecution);

  const handleOpenLoad = useCallback(() => {
    fetchWorkflowList();
    setShowLoadDialog(true);
  }, [fetchWorkflowList, setShowLoadDialog]);

  const handleRun = useCallback(async () => {
    const def = getWorkflowDef();
    const batchCount = batchItems.length > 0 ? batchItems.length : 1;
    try {
      const res = await fetch("http://localhost:3000/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflowId ?? undefined,
          nodes: def.nodes,
          edges: def.edges,
          batchCount,
        }),
      });
      const { runId } = await res.json();
      startExecution(runId, batchCount);
    } catch (err) {
      console.error("Failed to start execution:", err);
    }
  }, [getWorkflowDef, workflowId, startExecution, batchItems]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveWorkflow();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveWorkflow]);

  const saveIcon = (() => {
    switch (saveStatus) {
      case "saving": return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      case "saved": return <Check className="w-3.5 h-3.5 text-emerald-400" />;
      case "error": return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
      default: return <Save className="w-3.5 h-3.5" />;
    }
  })();

  return (
    <>
      <header className="h-11 shrink-0 bg-[#141414] border-b border-[#2a2a2a] flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Workflow className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-zinc-200">AdFlow</span>
          <span className="text-xs text-zinc-600">|</span>
          <span className="text-sm text-zinc-400 truncate max-w-[200px]">{workflowName}</span>
          {workflowId && (
            <span className="text-[10px] text-zinc-600 font-mono tracking-tight">{workflowId.slice(0, 6)}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {batchItems.length > 0 && (
            <span className="text-xs text-violet-400">{batchItems.length} batch items</span>
          )}

          <span className="text-xs text-zinc-600 mr-1">
            {nodeCount} node{nodeCount !== 1 ? "s" : ""}
          </span>

          <button
            onClick={() => setShowBatchUpload(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/5 text-xs text-zinc-400 transition-colors"
            title="Batch input"
          >
            <Images className="w-3.5 h-3.5" />
            Batch
          </button>

          <button
            onClick={newWorkflow}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/5 text-xs text-zinc-400 transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
            New
          </button>

          <button
            onClick={handleOpenLoad}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/5 text-xs text-zinc-400 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open
          </button>

          <button
            onClick={saveWorkflow}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs text-zinc-300 transition-colors border border-zinc-700"
          >
            {saveIcon}
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning || nodeCount === 0}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Run Workflow"}
          </button>
        </div>
      </header>

      {showLoadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowLoadDialog(false)}>
          <div
            className="bg-[#141414] border border-[#2a2a2a] rounded-2xl w-[420px] max-h-[500px] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-semibold text-zinc-200">Open Workflow</h2>
              <button onClick={() => setShowLoadDialog(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {savedWorkflows.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-8">No saved workflows yet</p>
              ) : (
                savedWorkflows.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => loadWorkflow(wf.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="text-sm text-zinc-300">{wf.name}</span>
                    <span className="text-xs text-zinc-600">
                      Updated {new Date(wf.updatedAt).toLocaleString()} · {wf.id.slice(0, 8)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
