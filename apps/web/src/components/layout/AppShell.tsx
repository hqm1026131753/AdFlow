import { TopBar } from "./TopBar";
import { NodeLibrary } from "../panels/NodeLibrary";
import { AgentPanel } from "../panels/AgentPanel";
import { ExecutionMonitor } from "../panels/ExecutionMonitor";
import { ShortcutPanel } from "../panels/ShortcutPanel";
import { BatchInputUpload } from "../batch/BatchInputUpload";
import { BatchResultsGrid } from "../batch/BatchResultsGrid";
import { FlowCanvas } from "../canvas/FlowCanvas";

export function AppShell() {
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
    </div>
  );
}
