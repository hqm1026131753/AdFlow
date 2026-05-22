import { useState } from "react";
import { Palette } from "lucide-react";
import { TopBar } from "./TopBar";
import { NodeLibrary } from "../panels/NodeLibrary";
import { AgentPanel } from "../panels/AgentPanel";
import { ExecutionMonitor } from "../panels/ExecutionMonitor";
import { ShortcutPanel } from "../panels/ShortcutPanel";
import { BatchInputUpload } from "../batch/BatchInputUpload";
import { BatchResultsGrid } from "../batch/BatchResultsGrid";
import { FlowCanvas } from "../canvas/FlowCanvas";
import { DesignSystemPanel } from "../panels/DesignSystemPanel";

export function AppShell() {
  const [showDesignSystem, setShowDesignSystem] = useState(false);

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a0a]">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <NodeLibrary />
        <FlowCanvas />
        <AgentPanel />
      </div>
      <ExecutionMonitor />
      <BatchInputUpload />
      <BatchResultsGrid />
      <ShortcutPanel />

      {/* Floating button to open Design System panel */}
      <button
        onClick={() => setShowDesignSystem(true)}
        className="fixed bottom-5 left-5 z-40 w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-500 hover:text-[#9E95F8] hover:border-[#9E95F8]/30 transition-all shadow-lg"
        title="品牌套件"
      >
        <Palette className="w-4 h-4" />
      </button>

      {showDesignSystem && (
        <DesignSystemPanel onClose={() => setShowDesignSystem(false)} />
      )}
    </div>
  );
}
