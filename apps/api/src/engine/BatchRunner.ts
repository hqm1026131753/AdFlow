import { ExecutionContext } from "./ExecutionContext";

export type BatchTaskFn = (
  nodeId: string,
  batchIndex: number,
  ctx: ExecutionContext
) => Promise<void>;

export interface BatchProgress {
  nodeId: string;
  batchIndex: number;
  status: "started" | "completed" | "error";
  error?: string;
  outputs?: Record<string, unknown>;
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}

export class BatchRunner {
  private concurrency: number;

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  async runWave(
    wave: string[],
    batchCount: number,
    contexts: ExecutionContext[],
    taskFn: BatchTaskFn,
    onProgress: (ev: BatchProgress) => void
  ): Promise<void> {
    if (batchCount === 0) throw new Error("No batch items");

    const tasks: Array<() => Promise<void>> = [];
    for (let bi = 0; bi < batchCount; bi++) {
      for (const nodeId of wave) {
        const ctx = contexts[bi];
        tasks.push(async () => {
          onProgress({ nodeId, batchIndex: bi, status: "started" });
          try {
            await taskFn(nodeId, bi, ctx);
            const outputs = ctx.getNodeOutput(nodeId);
            onProgress({ nodeId, batchIndex: bi, status: "completed", outputs });
          } catch (err) {
            onProgress({
              nodeId,
              batchIndex: bi,
              status: "error",
              error: err instanceof Error ? err.message : String(err),
            });
          }
        });
      }
    }

    await runWithConcurrency(tasks, this.concurrency);
  }
}
