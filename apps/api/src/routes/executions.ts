import { Router, type Request, type Response } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/connection";
import { executionRuns, executionResults } from "../db/schema";
import { eq } from "drizzle-orm";
import { WorkflowEngine } from "../engine/WorkflowEngine";
import { sseManager } from "../sse/manager";
import { log } from "../lib/logger";

export const executionsRouter = Router();

// POST /api/executions — trigger a run
executionsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { workflowId, nodes, edges, batchCount } = req.body;

    if (!workflowId && (!nodes || !edges)) {
      res.status(400).json({ error: "workflowId or (nodes + edges) required" });
      return;
    }

    const runId = uuid();
    const now = new Date().toISOString();
    const count = batchCount ?? 1;

    // Persist run record
    await db.insert(executionRuns).values({
      id: runId,
      workflowId: workflowId ?? "adhoc",
      status: "running",
      batchMeta: JSON.stringify({ count, items: [] }),
      startedAt: now,
      createdAt: now,
    });

    res.json({ runId, status: "running" });

    // Execute asynchronously
    const engine = new WorkflowEngine();
    engine
      .execute(
        {
          workflow: { nodes: nodes ?? [], edges: edges ?? [] },
          batchCount: count,
        },
        (event) => {
          sseManager.send(runId, event);
        }
      )
      .then(async () => {
        await db
          .update(executionRuns)
          .set({ status: "completed", completedAt: new Date().toISOString() })
          .where(eq(executionRuns.id, runId));
        log("exec", `Run ${runId} completed`);
      })
      .catch(async (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        sseManager.send(runId, { type: "run-error", error: msg });
        await db
          .update(executionRuns)
          .set({ status: "failed", error: msg, completedAt: new Date().toISOString() })
          .where(eq(executionRuns.id, runId));
        log("exec", `Run ${runId} failed: ${msg}`);
      });
  } catch (err) {
    log("exec:create", "Error:", err);
    res.status(500).json({ error: "Failed to start execution" });
  }
});

// GET /api/executions/:id — get run status
executionsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const run = await db.query.executionRuns.findFirst({ where: eq(executionRuns.id, id) });
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: "Failed to get execution" });
  }
});

// GET /api/executions/:id/events — SSE stream
executionsRouter.get("/:id/events", (req: Request, res: Response) => {
  const id = req.params.id as string;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`data: ${JSON.stringify({ type: "connected", runId: id })}\n\n`);

  sseManager.addClient(id, res);
});

// DELETE /api/executions/:id — cancel
executionsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db
      .update(executionRuns)
      .set({ status: "cancelled", completedAt: new Date().toISOString() })
      .where(eq(executionRuns.id, id));
    sseManager.send(id, { type: "run-error", error: "Cancelled by user" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel execution" });
  }
});
