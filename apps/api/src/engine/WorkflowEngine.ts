import { DAGBuilder } from "./DAGBuilder";
import { Scheduler } from "./Scheduler";
import { BatchRunner, type BatchProgress } from "./BatchRunner";
import { ExecutionContext } from "./ExecutionContext";
import { nodeRegistry } from "../nodes/registry";
import { log } from "../lib/logger";
import type { NodeInstance, Edge, SSEEvent } from "@ad-flow/shared";

export interface ExecutionInput {
  workflow: { nodes: NodeInstance[]; edges: Edge[] };
  batchCount: number;
}

export type ProgressCallback = (event: SSEEvent) => void;

export class WorkflowEngine {
  private dagBuilder = new DAGBuilder();
  private scheduler = new Scheduler();
  private batchRunner = new BatchRunner(3);

  async execute(input: ExecutionInput, onProgress: ProgressCallback): Promise<void> {
    const { workflow, batchCount } = input;

    // 1. Build DAG
    const dag = this.dagBuilder.build(workflow.nodes, workflow.edges);

    // 2. Compute waves
    const waves = this.scheduler.computeWaves(dag);
    log("engine", `Waves: ${waves.map((w) => `[${w.join(", ")}]`).join(" → ")}`);

    // 3. Create execution contexts per batch item
    const contexts = Array.from(
      { length: batchCount },
      (_, i) => new ExecutionContext(`run`, i)
    );

    // 4. Execute wave by wave
    for (let wi = 0; wi < waves.length; wi++) {
      const wave = waves[wi];
      onProgress({ type: "wave-start", waveIndex: wi, totalWaves: waves.length });
      log("engine", `Wave ${wi + 1}/${waves.length}: [${wave.join(", ")}]`);

      await this.batchRunner.runWave(
        wave,
        batchCount,
        contexts,
        async (nodeId, batchIndex, ctx) => {
          const dagNode = dag.nodes.get(nodeId)!;
          const executor = nodeRegistry.get(dagNode.nodeType);

          if (!executor) {
            throw new Error(`No executor registered for: ${dagNode.nodeType}`);
          }

          // Collect inputs from upstream nodes
          const inputs: Record<string, unknown> = {};
          for (const [portId, conn] of dagNode.inputs) {
            if (conn) {
              const upstreamOutput = ctx.getOutput(conn.sourceNodeId, conn.sourcePortId);
              inputs[portId] = upstreamOutput;
            }
          }

          onProgress({ type: "node-start", nodeId, batchIndex });

          const outputs = await executor.execute(inputs, {}, ctx);

          ctx.storeOutputs(nodeId, outputs);

          onProgress({ type: "node-complete", nodeId, batchIndex, outputs });
        },
        (progress: BatchProgress) => {
          if (progress.status === "error") {
            onProgress({
              type: "node-error",
              nodeId: progress.nodeId,
              batchIndex: progress.batchIndex,
              error: progress.error ?? "Unknown error",
            });
          }
        }
      );
    }

    onProgress({ type: "run-complete" });
    log("engine", "Run complete");
  }
}
